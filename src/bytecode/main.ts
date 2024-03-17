import { once } from "node:events";
import * as fs from "node:fs/promises";
import { createInterface } from "node:readline";

import { InterpretResult, VM } from "./vm.js";

async function repl(vm: VM) {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: "> ",
	});
	rl.prompt();
	rl.on("line", (line) => {
		vm.interpret(line);
		rl.prompt();
	});

	await once(rl, "close");
}

export async function runFile(vm: VM, path: string) {
	const source = await fs.readFile(path, "utf-8");
	const result = vm.interpret(source);
	if (result === InterpretResult.COMPILE_ERROR) {
		// eslint-disable-next-line n/no-process-exit
		process.exit(65);
	}
	if (result === InterpretResult.RUNTIME_ERROR) {
		// eslint-disable-next-line n/no-process-exit
		process.exit(70);
	}
}

export async function main() {
	const vm = new VM();

	const args = process.argv.slice(2);
	if (args.length === 0) {
		await repl(vm);
	} else if (args.length === 1) {
		await runFile(vm, args[0]);
	} else if (args.length > 1) {
		console.error("Usage:", process.argv[1], "[script]");
		// eslint-disable-next-line n/no-process-exit
		return process.exit(64);
	}

	vm.free();
}
