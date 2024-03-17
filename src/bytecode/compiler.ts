import util from "node:util";

import { Scanner as TreewalkScanner } from "../scanner.js";
import { Token } from "../token.js";
import { TokenType } from "../token-type.js";
import { Chunk, OpCode } from "./chunk.js";
import { DEBUG_PRINT_CODE } from "./common.js";
import { disassembleChunk } from "./debug.js";
import { Int } from "./int.js";
import { Value, numberValue } from "./value.js";
import { copyString } from "./object.js";

const UINT8_MAX = 255;

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
	prefix: () => void;
}

interface ParseRuleInfix extends ParseRuleBase {
	infix: () => void;
}

type ParseRule = ParseRuleBase | ParseRuleInfix | ParseRulePrefix;

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
	"==": [OpCode.Equal],
	">": [OpCode.Greater],
	">=": [OpCode.Less, OpCode.Not],
	"<": [OpCode.Less],
	"<=": [OpCode.Greater, OpCode.Not],
	"*": [OpCode.Multiply],
	"+": [OpCode.Add],
	"/": [OpCode.Divide],
	"-": [OpCode.Subtract],
};

export function compile(source: string): Chunk | null {
	/* eslint-disable perfectionist/sort-objects */
	const rules: Partial<Record<TokenType, ParseRule>> = {
		"(": { prefix: grouping, precedence: Precedence.None },
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
		number: { prefix: number, precedence: Precedence.None },
		false: { prefix: emitLiteral(OpCode.False), precedence: Precedence.None },
		true: { prefix: emitLiteral(OpCode.True), precedence: Precedence.None },
		nil: { prefix: emitLiteral(OpCode.Nil), precedence: Precedence.None },
		string: { prefix: string, precedence: Precedence.None },
		// ... to be filled in ...
	};
	/* eslint-enable perfectionist/sort-objects */

	const chunk = new Chunk();
	const scanner = new Scanner(source);
	let compilingChunk = chunk;
	let hadError = false;
	let panicMode = false;
	let previous = scanner.tokens[0];
	let current = scanner.tokens[0];
	advance();
	expression();
	consume("eof", "Expect end of expression.");
	endCompiler();
	if (hadError) {
		return null;
	} else {
		return chunk;
	}

	function currentChunk() {
		return compilingChunk;
	}

	function emitByte(byte: Int) {
		currentChunk().writeByte(byte, Int(previous.line));
	}
	function emitOpCode(code: OpCode) {
		currentChunk().writeOp(code, Int(previous.line));
	}
	function emitOpAndByte(code: OpCode, byte: Int) {
		emitOpCode(code);
		emitByte(byte);
	}

	function emitReturn() {
		emitOpCode(OpCode.Return);
	}

	function emitConstant(value: Value) {
		emitOpAndByte(OpCode.Constant, makeConstant(value));
	}

	function makeConstant(value: Value): Int {
		const constant = currentChunk().addConstant(value);
		if (constant > UINT8_MAX) {
			error("Too many constants in one chunk.");
			return Int(0);
		}
		return constant;
	}

	function endCompiler() {
		emitReturn();
		if (DEBUG_PRINT_CODE) {
			if (!hadError) {
				disassembleChunk(currentChunk(), "code");
			}
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

	function emitLiteral(code: OpCode) {
		return () => {
			emitOpCode(code);
		};
	}

	function expression() {
		parsePrecedence(Precedence.Assignment);
	}

	function number() {
		const value = Number(previous.lexeme);
		emitConstant(numberValue(value));
	}
	function string() {
		emitConstant(copyString(previous.lexeme.slice(1, -1)));
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
		rule.prefix();
		while (precedence <= getRule(current.type).precedence) {
			advance();
			const inRule = getRule(previous.type);
			if ("infix" in inRule) {
				inRule.infix();
			} else {
				error("Expected infix rule");
				return;
			}
		}
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
