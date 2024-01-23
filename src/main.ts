import { once } from "node:events";
import * as fs from "node:fs/promises";
import { createInterface } from "node:readline";

import { Expr } from "./ast.js";
import { Interpreter, RuntimeError, stringify } from "./interpreter.js";
import { parse } from "./parser.js";
import { makeResolver } from "./resolver.js";
import { Scanner } from "./scanner.js";
import { Token } from "./token.js";

export async function runFile(interpreter: Interpreter, path: string) {
	const contents = await fs.readFile(path, "utf-8");
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

export function resetErrors() {
	hadError = false;
	hadRuntimeError = false;
}

export async function runPrompt(interpreter: Interpreter) {
	// https://nodejs.org/api/readline.html#example-tiny-cli
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: "> ",
	});
	rl.prompt();
	rl.on("line", (line) => {
		const expr = maybeParseAsExpression(line);
		if (expr) {
			console.log(stringify(interpreter.evaluate(expr)));
		} else {
			run(interpreter, line);
		}
		resetErrors();
		rl.prompt();
	});

	await once(rl, "close");
}

let hadError = false;
let hadRuntimeError = false;
/** Throw exceptions on parse errors rather than logging. */
let throwMode = false;

class ParseError extends Error {}

export function maybeParseAsExpression(line: string): Expr | null {
	throwMode = true;
	try {
		const scanner = new Scanner(line + ";");
		const tokens = scanner.scanTokens();
		const statements = parse(tokens);
		if (statements?.length === 1 && statements[0].kind === "expr") {
			return statements[0].expression;
		}
	} catch (e) {
		if (!(e instanceof ParseError)) {
			throw e;
		}
	} finally {
		throwMode = false;
	}
	return null;
}

export function error(line: number, message: string) {
	report(line, "", message);
}
export function errorOnToken(token: Token, message: string) {
	if (throwMode) {
		throw new ParseError(message);
	}
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
	hadError = true;
}

function run(interpreter: Interpreter, contents: string): void {
	const scanner = new Scanner(contents);
	const tokens = scanner.scanTokens();
	const statements = parse(tokens);
	if (hadError || !statements) {
		return;
	}

	const resolver = makeResolver(interpreter);
	resolver.resolveStmts(statements);

	interpreter.interpret(statements);
}

export async function main() {
	const args = process.argv.slice(2);
	if (args.length > 1) {
		console.error("Usage:", process.argv[1], "[script]");
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
