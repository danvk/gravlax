import util from "node:util";

import { Scanner as TreewalkScanner } from "../scanner.js";
import { Token } from "../token.js";

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

export function compile(source: string) {
	const scanner = new Scanner(source);
	let line = -1;
	while (true) {
		const token = scanner.scanToken();
		let logLine = "";
		if (token.line !== line) {
			logLine += util.format(token.line); // %04d
			line = token.line;
		} else {
			logLine += "   | ";
		}
		logLine += util.format("%s '%s'", token.type, token.lexeme);
		console.log(logLine);
		if (token.type === "eof") {
			break;
		}
	}
}
