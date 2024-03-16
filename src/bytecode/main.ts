import { once } from "node:events";
import * as fs from "node:fs/promises";
import { createInterface } from "node:readline";

import { Chunk, OpCode } from "./chunk.js";
import { compile } from "./compiler.js";
import { disassembleChunk } from "./debug.js";
import { Int } from "./int.js";
import { Value } from "./value.js";
import { InterpretResult, VM } from "./vm.js";

async function repl(vm: VM) {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: "> ",
	});
	rl.prompt();
	rl.on("line", (line) => {
		interpret(vm, line);
		rl.prompt();
	});

	await once(rl, "close");
}

function interpret(vm: VM, source: string): InterpretResult {
	compile(source);
	return InterpretResult.OK;
}

export async function runFile(vm: VM, path: string) {
	const source = await fs.readFile(path, "utf-8");
	const result = interpret(vm, source);
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

	const chunk = new Chunk();
	let constant = chunk.addConstant(Value(1.2));
	chunk.writeOpAndByte(OpCode.Constant, constant, Int(123));

	constant = chunk.addConstant(Value(3.4));
	chunk.writeOpAndByte(OpCode.Constant, constant, Int(123));

	chunk.writeOp(OpCode.Add, Int(123));

	constant = chunk.addConstant(Value(5.6));
	chunk.writeOpAndByte(OpCode.Constant, constant, Int(123));

	chunk.writeOp(OpCode.Divide, Int(123));
	chunk.writeOp(OpCode.Negate, Int(123));
	chunk.writeOp(OpCode.Return, Int(123));
	chunk.writeByte(constant, Int(123));
	disassembleChunk(chunk, "test chunk");

	console.log("executing...");
	vm.interpret(chunk);
	chunk.free();
}
