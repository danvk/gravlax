import { sprintf } from "sprintf-js";

import { Chunk, OpCode } from "./chunk.js";
import { Int } from "./int.js";
import { assertUnreachable } from "./util.js";

export function disassembleChunk(chunk: Chunk, name: string) {
	console.log(`== ${name} ==`);
	for (let offset = Int(0); offset < chunk.length; ) {
		offset = disassembleInstruction(chunk, offset);
	}
}

export function disassembleInstruction(chunk: Chunk, offset: Int): Int {
	let logLine = sprintf("%04d", offset);
	if (offset > 0 && chunk.lines[offset] == chunk.lines[offset - 1]) {
		logLine += "   | ";
	} else {
		logLine += sprintf("%4d ", chunk.lines[offset]);
	}
	process.stderr.write(logLine);
	const instruction = chunk.getByteAt(offset) as OpCode;
	switch (instruction) {
		case OpCode.Return:
			return simpleInstruction("OP_RETURN", offset);
		case OpCode.Constant:
			return constantInstruction("OP_CONSTANT", chunk, offset);
		case OpCode.Negate:
			return simpleInstruction("OP_NEGATE", offset);
		case OpCode.Add:
			return simpleInstruction("OP_ADD", offset);
		case OpCode.Subtract:
			return simpleInstruction("OP_SUBTRACT", offset);
		case OpCode.Multiply:
			return simpleInstruction("OP_MULTIPLY", offset);
		case OpCode.Divide:
			return simpleInstruction("OP_DIVIDE", offset);
		default:
			console.log("Unknown opcode", instruction);
			assertUnreachable(instruction);
		// return (offset + 1) as Int;
	}
}

export function simpleInstruction(name: string, offset: Int) {
	process.stderr.write(name);
	process.stderr.write("\n");
	return (offset + 1) as Int;
}

export function constantInstruction(name: string, chunk: Chunk, offset: Int) {
	const constant = chunk.getByteAt((offset + 1) as Int);
	// console.log("%-16s %4d '%g'", name, constant, chunk.getValueAt(constant));
	console.log(
		sprintf("%-16s %4d '%g'", name, constant, chunk.getValueAt(constant)),
	);
	return (offset + 2) as Int;
}
