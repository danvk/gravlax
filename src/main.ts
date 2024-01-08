import * as fs from "node:fs/promises";
import { createInterface } from "node:readline";

export function add(a: number, b: number) {
	return a + b;
}

export function run(contents: string): void {
	console.log(contents);
}

export async function runFile(path: string) {
	const contents = await fs.readFile(path, "utf-8");
	run(contents);
}

export async function runPrompt() {
	process.stdout.write("> ");
	for await (const line of createInterface({ input: process.stdin })) {
		run(line);
		process.stdout.write("> ");
	}
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
}
