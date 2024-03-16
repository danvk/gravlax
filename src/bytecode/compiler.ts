import util from "node:util";

import { Scanner as TreewalkScanner } from "../scanner.js";
import { Token } from "../token.js";
import { TokenType } from "../token-type.js";
import { Chunk } from "./chunk.js";

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
	let hadError = false;
	let panicMode = false;
	let previous = scanner.tokens[0];
	let current = scanner.tokens[0];
	expression();
	consume("eof", "Expect end of expression.");
	if (hadError) {
		return null;
	} else {
		return chunk;
	}

	function expression() {}

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
