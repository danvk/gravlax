import util from "node:util";

import { Scanner as TreewalkScanner } from "../scanner.js";
import { Token } from "../token.js";
import { TokenType } from "../token-type.js";
import { Chunk, OpCode } from "./chunk.js";
import { Int } from "./int.js";
import { Value } from "./value.js";

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

export function compile(source: string): Chunk | null {
	const chunk = new Chunk();
	const scanner = new Scanner(source);
	advance();
	let compilingChunk = chunk;
	let hadError = false;
	let panicMode = false;
	let previous = scanner.tokens[0];
	let current = scanner.tokens[0];
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
	function emitBytes(...bytes: Int[]) {
		for (const byte of bytes) {
			currentChunk().writeByte(byte, Int(previous.line));
		}
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
	}

	function expression() {
		parsePrecedence(Precedence.Assignment);
	}

	function number() {
		const value = Number(previous.lexeme);
		emitConstant(Value(value));
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
			default:
				return; // unreachable
		}
	}

	function parsePrecedence(precedence: Precedence) {}

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
