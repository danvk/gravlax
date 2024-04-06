import util from "node:util";

import { Scanner as TreewalkScanner } from "../scanner.js";
import { Token } from "../token.js";
import { TokenType } from "../token-type.js";
import { OpCode } from "./chunk.js";
import { DEBUG_PRINT_CODE } from "./common.js";
import { disassembleChunk } from "./debug.js";
import { Pointer, deref } from "./heap.js";
import { Int, UInt8 } from "./int.js";
import { ObjFunction, asString, copyString, newFunction } from "./object.js";
import { Value, ValueType, numberValue } from "./value.js";

const UINT8_MAX = 255;
const UINT8_COUNT = 256;
const UINT16_MAX = 65536;

enum Precedence {
	None,
	Assignment, // =
	Or, // or
	And, // and
	Equality, // == !=
	Comparison, // < > <= >=
	Term, // + -
	Factor, // * /
	Unary, // ! -
	Call, // . ()
	Primary,
}

interface ParseRuleBase {
	precedence: Precedence;
}

interface ParseRulePrefix extends ParseRuleBase {
	prefix: (canAssign: boolean) => void;
}

interface ParseRuleInfix extends ParseRuleBase {
	infix: () => void;
}

type ParseRule = ParseRuleBase | ParseRuleInfix | ParseRulePrefix;

interface CompilerState {
	enclosing: CompilerState | null;
	function: Pointer<ObjFunction>;
	type: FunctionType;
	locals: Local[]; // this is fixed-size in the book
	upvalues: Upvalue[]; // this is fixed-size in the book
	localCount: number; // this probably isn't needed
	scopeDepth: number;
}

interface Local {
	name: Token;
	depth: number;
	isCaptured: boolean;
}

interface Upvalue {
	index: Int;
	isLocal: boolean;
}

enum FunctionType {
	Function,
	Script,
}

const emptyRule: ParseRule = { precedence: Precedence.None };

export class Scanner {
	index: number;
	tokens: Token[];
	constructor(source: string) {
		const scanner = new TreewalkScanner(source);
		this.tokens = scanner.scanTokens();
		this.index = 0;
	}

	scanToken(): Token {
		const token = this.tokens[this.index];
		this.index++;
		return token;
	}
}

const BIN_OP_CODES = {
	"!=": [OpCode.Equal, OpCode.Not],
	"*": [OpCode.Multiply],
	"+": [OpCode.Add],
	"/": [OpCode.Divide],
	"<": [OpCode.Less],
	"<=": [OpCode.Greater, OpCode.Not],
	"==": [OpCode.Equal],
	">": [OpCode.Greater],
	">=": [OpCode.Less, OpCode.Not],
	"-": [OpCode.Subtract],
};

export function compile(source: string): Pointer<ObjFunction> | null {
	/* eslint-disable perfectionist/sort-objects */
	const rules: Partial<Record<TokenType, ParseRule>> = {
		"(": {
			prefix: grouping,
			infix: call,
			precedence: Precedence.Call,
		},
		"-": { prefix: unary, infix: binary, precedence: Precedence.Term },
		"+": { infix: binary, precedence: Precedence.Term },
		"/": { infix: binary, precedence: Precedence.Factor },
		"*": { infix: binary, precedence: Precedence.Factor },
		"!": { prefix: unary, precedence: Precedence.None },
		"!=": { infix: binary, precedence: Precedence.Equality },
		"==": { infix: binary, precedence: Precedence.Equality },
		">": { infix: binary, precedence: Precedence.Comparison },
		">=": { infix: binary, precedence: Precedence.Comparison },
		"<": { infix: binary, precedence: Precedence.Comparison },
		"<=": { infix: binary, precedence: Precedence.Comparison },
		identifier: { prefix: variable, precedence: Precedence.None },
		number: { prefix: number, precedence: Precedence.None },
		and: { infix: and, precedence: Precedence.And },
		or: { infix: or, precedence: Precedence.Or },
		false: { prefix: emitLiteral(OpCode.False), precedence: Precedence.None },
		true: { prefix: emitLiteral(OpCode.True), precedence: Precedence.None },
		nil: { prefix: emitLiteral(OpCode.Nil), precedence: Precedence.None },
		string: { prefix: string, precedence: Precedence.None },
		// ... to be filled in ...
	};
	/* eslint-enable perfectionist/sort-objects */

	const scanner = new Scanner(source);
	let currentState: CompilerState = null as any;
	currentState = initCompiler(FunctionType.Script); // TODO: this could be a class
	let hadError = false;
	let panicMode = false;
	let previous = scanner.tokens[0];
	let current = scanner.tokens[0];
	advance();
	while (!match("eof")) {
		declaration();
	}
	const func = endCompiler();
	return hadError ? null : func;

	function currentChunk() {
		return deref(currentState.function).chunk;
	}

	function emitByte(byte: Int) {
		currentChunk().writeByte(byte, previous.line);
	}
	function emitOpCode(code: OpCode) {
		currentChunk().writeOp(code, previous.line);
	}
	function emitOpAndByte(code: OpCode, byte: Int) {
		emitOpCode(code);
		emitByte(byte);
	}

	function emitLoop(loopStart: number) {
		emitOpCode(OpCode.Loop);
		const offset = currentChunk().count - loopStart + 2;
		if (offset > UINT16_MAX) {
			error("Loop body too large.");
		}
		// TODO: implement emitShort()
		emitByte(UInt8((offset >> 8) & 0xff));
		emitByte(UInt8(offset & 0xff));
	}

	function emitJump(code: OpCode): number {
		emitOpCode(code);
		emitByte(UInt8(255));
		emitByte(UInt8(255));
		return currentChunk().count - 2;
	}

	function emitReturn() {
		emitByte(Int(OpCode.Nil)); // implicit return
		emitOpCode(OpCode.Return);
	}

	function emitConstant(value: Value) {
		emitOpAndByte(OpCode.Constant, makeConstant(value));
	}

	function patchJump(offset: number) {
		// -2 to adjust for the bytecode for the jump offset itself.
		const jump = currentChunk().count - offset - 2;
		if (jump > UINT16_MAX) {
			error("Too much code to jump over.");
		}
		currentChunk().code[offset] = (jump >> 8) & 0xff;
		currentChunk().code[offset + 1] = jump & 0xff;
	}

	function makeConstant(value: Value): Int {
		const constant = currentChunk().addConstant(value);
		if (constant > UINT8_MAX) {
			error("Too many constants in one chunk.");
			return Int(0);
		}
		return constant;
	}

	function initCompiler(type: FunctionType): CompilerState {
		// book sets currentState here
		const state: CompilerState = {
			enclosing: currentState,
			function: newFunction(),
			localCount: 1,
			locals: [
				// claim slot zero for internal use
				{
					depth: 0,
					isCaptured: false,
					name: { lexeme: "", line: 0, literal: null, type: "string" },
				},
			],
			scopeDepth: 0,
			type,
			upvalues: [],
		};
		if (type !== FunctionType.Script) {
			deref(state.function).name = asString(copyString(previous.lexeme));
		}
		currentState = state;
		return state;
	}

	function endCompiler(): Pointer<ObjFunction> {
		emitReturn();
		const fnPtr = currentState.function;
		const fn = deref(fnPtr);
		if (DEBUG_PRINT_CODE) {
			if (!hadError) {
				disassembleChunk(currentChunk(), fn.name?.chars ?? "<script>");
			}
		}
		currentState = currentState.enclosing!;
		return fnPtr;
	}

	function beginScope() {
		currentState.scopeDepth++;
	}

	function endScope() {
		currentState.scopeDepth--;
		// console.log("endScope", currentState.locals);
		while (
			currentState.locals.length > 0 &&
			currentState.locals.at(-1)!.depth > currentState.scopeDepth
		) {
			// TODO: add an OpCode.PopN to pop N items from the stack.
			if (currentState.locals.at(-1)!.isCaptured) {
				// console.log("close upvalue");
				emitOpCode(OpCode.CloseUpvalue);
			} else {
				emitOpCode(OpCode.Pop);
			}
			currentState.locals.pop();
			currentState.localCount--;
		}
	}

	function binary() {
		const operatorType = previous.type;
		const rule = getRule(operatorType);
		parsePrecedence(rule.precedence + 1); // +1 = left assoc, +0 = right assoc

		const opCodes = BIN_OP_CODES[operatorType as keyof typeof BIN_OP_CODES];
		if (opCodes) {
			opCodes.forEach(emitOpCode);
		}
	}

	function call() {
		const argCount = argumentList();
		emitOpAndByte(OpCode.Call, Int(argCount));
	}

	function emitLiteral(code: OpCode) {
		return () => {
			emitOpCode(code);
		};
	}

	function expression() {
		parsePrecedence(Precedence.Assignment);
	}

	function block() {
		while (!check("}") && !check("eof")) {
			declaration();
		}
		consume("}", "Expect '}' after block.");
	}

	function fn(type: FunctionType) {
		currentState = initCompiler(type);
		const compiler = currentState;
		beginScope(); // intentionally no matching endScope()

		consume("(", "Expect '(' after function name.");
		if (!check(")")) {
			do {
				deref(currentState.function).arity++;
				if (deref(currentState.function).arity > 255) {
					errorAtCurrent("Can't have more than 255 parameters.");
				}
				const constant = parseVariable("Expect parameter name.");
				defineVariable(constant);
			} while (match(","));
		}
		consume(")", "Expect ')' after parameters.");
		consume("{", "Expect '{' before function body.");
		block();

		const func = endCompiler();
		emitOpAndByte(
			OpCode.Closure,
			makeConstant({ obj: func, type: ValueType.Obj }),
		);
		const fn = deref(func);
		for (let i = 0; i < fn.upvalueCount; i++) {
			const upvalue = compiler.upvalues[i];
			emitByte(Int(upvalue.isLocal ? 1 : 0));
			emitByte(UInt8(upvalue.index));
		}
	}

	function funDeclaration() {
		const global = parseVariable("Expect function name.");
		markInitialized();
		fn(FunctionType.Function);
		defineVariable(global);
	}

	function varDeclaration() {
		const global = parseVariable("Expect variable name.");
		if (match("=")) {
			expression();
		} else {
			emitOpCode(OpCode.Nil);
		}
		consume(";", "Expect ';' after variable declaration.");
		defineVariable(global);
	}

	function expressionStatement() {
		expression();
		consume(";", "Expect ';' after expression.");
		emitOpCode(OpCode.Pop);
	}

	function forStatement() {
		beginScope();
		consume("(", "Expect '(' after 'for'.");
		if (match(";")) {
			// no initializer
		} else if (match("var")) {
			varDeclaration();
		} else {
			expressionStatement();
		}
		let loopStart = currentChunk().count;
		let exitJump = -1;
		if (!match(";")) {
			expression();
			consume(";", "Expect ';' after loop condition.");
			// Jump out of the loop if the condition is false.
			exitJump = emitJump(OpCode.JumpIfFalse);
			emitOpCode(OpCode.Pop);
		}

		if (!match(")")) {
			// This is convoluted because of the single-pass compile.
			const bodyJump = emitJump(OpCode.Jump);
			const incrementStart = currentChunk().count;
			expression();
			emitOpCode(OpCode.Pop);
			consume(")", "Expect ')' after for clauses.");
			emitLoop(loopStart);
			loopStart = incrementStart;
			patchJump(bodyJump);
		}

		statement();
		emitLoop(loopStart);
		if (exitJump !== -1) {
			patchJump(exitJump);
			emitOpCode(OpCode.Pop); // condition
		}
		endScope();
	}

	function ifStatement() {
		consume("(", "Expect '(' after 'if'.");
		expression();
		consume(")", "Expect ')' after 'if'.");
		const thenJump = emitJump(OpCode.JumpIfFalse);
		emitOpCode(OpCode.Pop);
		statement();
		const elseJump = emitJump(OpCode.Jump);
		patchJump(thenJump);
		emitOpCode(OpCode.Pop);
		if (match("else")) {
			statement();
		}
		patchJump(elseJump);
	}

	function printStatement() {
		expression();
		consume(";", "Expect ';' after value.");
		emitOpCode(OpCode.Print);
	}

	function returnStatement() {
		if (currentState.type === FunctionType.Script) {
			error("Can't return from top-level code.");
		}
		if (match(";")) {
			emitReturn();
		} else {
			expression();
			consume(";", "Expect ';' after return value.");
			emitOpCode(OpCode.Return);
		}
	}

	function whileStatement() {
		const loopStart = currentChunk().count;
		consume("(", "Expect '(' after 'while'.");
		expression();
		consume(")", "Expect ')' after condition.");
		const exitJump = emitJump(OpCode.JumpIfFalse);
		emitOpCode(OpCode.Pop);
		statement();
		emitLoop(loopStart);
		patchJump(exitJump);
		emitOpCode(OpCode.Pop);
	}

	function synchronize() {
		panicMode = false;
		while (current.type != "eof") {
			if (previous.type === ";") {
				return;
			}
			switch (current.type) {
				case "class":
				case "fun":
				case "var":
				case "for":
				case "if":
				case "while":
				case "return":
					return;
				default:
				// do nothing by default
			}
			advance();
		}
	}

	function declaration() {
		if (match("fun")) {
			funDeclaration();
		} else if (match("var")) {
			varDeclaration();
		} else {
			statement();
		}
		if (panicMode) {
			synchronize();
		}
	}

	function statement() {
		if (match("print")) {
			printStatement();
		} else if (match("for")) {
			forStatement();
		} else if (match("if")) {
			ifStatement();
		} else if (match("return")) {
			returnStatement();
		} else if (match("while")) {
			whileStatement();
		} else if (match("{")) {
			beginScope();
			block();
			endScope();
		} else {
			expressionStatement();
		}
	}

	function number() {
		const value = Number(previous.lexeme);
		emitConstant(numberValue(value));
	}

	function or() {
		const elseJump = emitJump(OpCode.JumpIfFalse);
		const endJump = emitJump(OpCode.Jump);
		patchJump(elseJump);
		emitOpCode(OpCode.Pop);
		parsePrecedence(Precedence.Or);
		patchJump(endJump);
	}

	function string() {
		emitConstant(copyString(previous.lexeme.slice(1, -1)));
	}

	function namedVariable(name: Token, canAssign: boolean) {
		let getOp: OpCode, setOp: OpCode;
		let arg = resolveLocal(currentState, name);
		if (arg !== -1) {
			getOp = OpCode.GetLocal;
			setOp = OpCode.SetLocal;
		} else if ((arg = resolveUpvalue(currentState, name)) !== -1) {
			getOp = OpCode.GetUpvalue;
			setOp = OpCode.SetUpvalue;
		} else {
			arg = identifierConstant(name);
			getOp = OpCode.GetGlobal;
			setOp = OpCode.SetGlobal;
		}
		if (canAssign && match("=")) {
			expression();
			emitOpAndByte(setOp, arg);
		} else {
			emitOpAndByte(getOp, arg);
		}
	}
	function variable(canAssign: boolean) {
		namedVariable(previous, canAssign);
	}

	function grouping() {
		expression();
		consume(")", "Expect ')' after expression.");
	}

	function unary() {
		const operatorType = previous.type;
		parsePrecedence(Precedence.Unary);
		switch (operatorType) {
			case "-":
				emitOpCode(OpCode.Negate);
				break;
			case "!":
				emitOpCode(OpCode.Not);
				break;
			default:
				return; // unreachable
		}
	}

	function parsePrecedence(precedence: Precedence) {
		advance();
		const rule = getRule(previous.type);
		if (!("prefix" in rule)) {
			error("Expect expression.");
			return;
		}
		const canAssign = precedence <= Precedence.Assignment;
		rule.prefix(canAssign);
		while (precedence <= getRule(current.type).precedence) {
			advance();
			const inRule = getRule(previous.type);
			if ("infix" in inRule) {
				inRule.infix();
			} else {
				error("Expected infix rule");
				return;
			}

			if (canAssign && match("=")) {
				error("Invalid assignment target.");
			}
		}
	}

	function identifierConstant(name: Token) {
		if (typeof name.literal !== "string") {
			error("Variable names must be strings.");
			return Int(0);
		}

		return makeConstant(copyString(name.literal));
	}

	function resolveLocal(compiler: CompilerState, name: Token): Int {
		for (let i = compiler.locals.length - 1; i >= 0; i--) {
			const local = compiler.locals[i];
			if (name.literal === local.name.literal) {
				if (local.depth === -1) {
					error("Can't read local variable in its own initializer.");
				}
				return Int(i);
			}
		}
		return Int(-1);
	}

	function addUpvalue(
		compiler: CompilerState,
		index: Int,
		isLocal: boolean,
	): Int {
		const fn = deref(compiler.function);
		for (const [i, upvalue] of compiler.upvalues.entries()) {
			if (upvalue.index == index && upvalue.isLocal == isLocal) {
				return UInt8(i);
			}
		}
		if (fn.upvalueCount == UINT8_COUNT) {
			error("Too many closure variables in function.");
			return Int(0);
		}
		compiler.upvalues.push({ index, isLocal });
		const result = UInt8(fn.upvalueCount++);
		return result;
	}

	function resolveUpvalue(compiler: CompilerState, name: Token): Int {
		if (compiler.enclosing === null) {
			return Int(-1);
		}
		const local = resolveLocal(compiler.enclosing, name);
		if (local !== -1) {
			compiler.enclosing.locals[local].isCaptured = true;
			// console.log(
			// 	"capturing!",
			// 	deref(compiler.enclosing.function).name?.chars,
			// 	local,
			// 	compiler.enclosing.locals,
			// );
			return addUpvalue(compiler, local, true);
		}
		const upvalue = resolveUpvalue(compiler.enclosing, name);
		if (upvalue !== -1) {
			return addUpvalue(compiler, upvalue, false);
		}
		return Int(-1);
	}

	function addLocal(name: Token) {
		if (currentState.localCount == UINT8_COUNT) {
			error("Too many local variables in function.");
			return;
		}
		currentState.locals.push({
			depth: -1,
			isCaptured: false,
			name,
		});
		currentState.localCount++;
	}

	function declareVariable() {
		if (currentState.scopeDepth === 0) {
			return;
		}

		const name = previous;
		for (const local of currentState.locals.toReversed()) {
			if (local.depth !== -1 && local.depth < currentState.scopeDepth) {
				break;
			}
			if (name.literal === local.name.literal) {
				error("Already a variable with this name in this scope.");
			}
		}
		addLocal(name);
	}

	function parseVariable(errorMessage: string) {
		consume("identifier", errorMessage);
		declareVariable();
		if (currentState.scopeDepth > 0) {
			return Int(0);
		}
		return identifierConstant(previous);
	}

	function markInitialized() {
		if (currentState.scopeDepth === 0) {
			return;
		}
		currentState.locals.at(-1)!.depth = currentState.scopeDepth;
	}

	function defineVariable(global: Int) {
		if (currentState.scopeDepth > 0) {
			markInitialized();
			return; // value is already on top of the stack
		}
		emitOpAndByte(OpCode.DefineGlobal, global);
	}

	function argumentList() {
		let argCount = 0;
		if (!check(")")) {
			do {
				expression();
				if (argCount === 255) {
					error("Can't have more than 255 arguments.");
				}
				argCount++;
			} while (match(","));
		}
		consume(")", "Expect ')' after arguments.");
		return argCount;
	}

	function and() {
		const endJump = emitJump(OpCode.JumpIfFalse);
		emitOpCode(OpCode.Pop);
		parsePrecedence(Precedence.And);
		patchJump(endJump);
	}

	function getRule(type: TokenType): ParseRule {
		return rules[type] ?? emptyRule;
	}

	function advance() {
		previous = current;
		current = scanner.scanToken();
		// Book does error handling on error tokens here.
	}

	function consume(type: TokenType, message: string) {
		if (current.type === type) {
			advance();
			return;
		}
		errorAtCurrent(message);
	}

	function check(type: TokenType) {
		return current.type === type;
	}

	function match(type: TokenType) {
		if (!check(type)) {
			return false;
		}
		advance();
		return true;
	}

	function errorAt(token: Token, message: string) {
		if (panicMode) {
			return;
		}
		let logLine = util.format("[line %d] Error", token.line);
		if (token.type === "eof") {
			logLine += " at end";
			// book implementation introduces an error token
		} else {
			logLine += util.format(" at %s", token.lexeme);
		}
		console.error(logLine + ": " + message);
		hadError = true;
		panicMode = true;
	}
	function error(message: string) {
		errorAt(previous, message);
	}
	function errorAtCurrent(message: string) {
		errorAt(current, message);
	}
}
