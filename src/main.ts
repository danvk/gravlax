import * as fs from "node:fs/promises";
import { createInterface } from "node:readline";

import { Scanner } from "./scanner.js";
import { Token } from "./token.js";
import { parse } from "./parser.js";
import { astPrinter } from "./ast-printer.js";
import { visitExpr } from "./ast.js";

export function add(a: number, b: number) {
	return a + b;
}

export async function runFile(path: string) {
	const contents = await fs.readFile(path, "utf-8");
	run(contents);
}

export async function runPrompt() {
	process.stdout.write("> ");
	for await (const line of createInterface({ input: process.stdin })) {
		run(line);
		hadError = false;
		process.stdout.write("> ");
	}
}

let hadError = false;

export function error(line: number, message: string) {
	report(line, "", message);
}
export function errorOnToken(token: Token, message: string) {
	if (token.type === "eof") {
		report(token.line, " at end", message);
	} else {
		report(token.line, ` at '${token.lexeme}'`, message);
	}
}

function report(line: number, where: string, message: string) {
	console.error(`[line ${line}] Error${where}: ${message}`);
}

function run(contents: string): void {
	const scanner = new Scanner(contents);
	const tokens = scanner.scanTokens();
	const expr = parse(tokens);
	if (hadError || !expr) {
		return;
	}

	console.log(visitExpr(expr, astPrinter));
}

export async function main() {
	const args = process.argv.slice(2);
	if (args.length > 1) {
		console.error("Usage:", args[1], "[script]");
		// eslint-disable-next-line n/no-process-exit
		process.exit(64);
	} else if (args.length == 1) {
		await runFile(args[0]);
	} else {
		await runPrompt();
	}

	if (hadError) {
		// eslint-disable-next-line n/no-process-exit
		process.exit(65);
	}
}
