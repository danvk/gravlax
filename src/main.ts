import * as fs from "node:fs/promises";
import { createInterface } from "node:readline";

import { Interpreter, RuntimeError } from "./interpreter.js";
import { parse } from "./parser.js";
import { Scanner } from "./scanner.js";
import { Token } from "./token.js";

export function add(a: number, b: number) {
	return a + b;
}

export async function runFile(interpreter: Interpreter, path: string) {
	let contents = await fs.readFile(path, "utf-8");
	run(interpreter, contents);
	if (hadError) {
		// eslint-disable-next-line n/no-process-exit
		process.exit(65);
	}
	if (hadRuntimeError) {
		// eslint-disable-next-line n/no-process-exit
		process.exit(70);
	}
}

export async function runPrompt(interpreter: Interpreter) {
	process.stdout.write("> ");
	for await (const line of createInterface({ input: process.stdin })) {
		run(interpreter, line);
		hadError = false;
		process.stdout.write("> ");
	}
}

let hadError = false;
let hadRuntimeError = false;

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
export function runtimeError(error: RuntimeError) {
	console.error(`${error.message}\n[line ${error.token.line}]`);
	hadRuntimeError = true;
}

function report(line: number, where: string, message: string) {
	console.error(`[line ${line}] Error${where}: ${message}`);
}

function run(interpreter: Interpreter, contents: string): void {
	const scanner = new Scanner(contents);
	const tokens = scanner.scanTokens();
	const expr = parse(tokens);
	if (hadError || !expr) {
		return;
	}

	interpreter.interpret(expr);
}

export async function main() {
	const args = process.argv.slice(2);
	if (args.length > 1) {
		console.error("Usage:", args[1], "[script]");
		// eslint-disable-next-line n/no-process-exit
		process.exit(64);
	}

	const interpreter = new Interpreter();
	if (args.length == 1) {
		await runFile(interpreter, args[0]);
	} else {
		await runPrompt(interpreter);
	}
}
