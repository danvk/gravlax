import * as util from "util";

import { Chunk, OpCode } from "./chunk.js";
import { Int } from "./int.js";

export function disassembleChunk(chunk: Chunk, name: string) {
	console.log(`== ${name} ==`);
	for (let offset = Int(0); offset < chunk.length; ) {
		offset = disassembleInstruction(chunk, offset);
	}
}

export function disassembleInstruction(chunk: Chunk, offset: Int): Int {
	// TODO: switch to sprintf-js
	let logLine = util.format("%04d", offset);
	if (offset > 0 && chunk.lines[offset] == chunk.lines[offset - 1]) {
		logLine += "   | ";
	} else {
		logLine += util.format("%4d ", chunk.lines[offset]);
	}
	console.log(logLine);
	const instruction = chunk.getByteAt(offset);
	switch (instruction) {
		case OpCode.Return:
			return simpleInstruction("OP_RETURN", offset);
		case OpCode.Constant:
			return constantInstruction("OP_CONSTANT", chunk, offset);
		case OpCode.Negate:
			return simpleInstruction("OP_NEGATE", offset);
		default:
			console.log("Unknown opcode", instruction);
			return (offset + 1) as Int;
	}
}

export function simpleInstruction(name: string, offset: Int) {
	console.log(name);
	return (offset + 1) as Int;
}

export function constantInstruction(name: string, chunk: Chunk, offset: Int) {
	const constant = chunk.getByteAt((offset + 1) as Int);
	// console.log("%-16s %4d '%g'", name, constant, chunk.getValueAt(constant));
	console.log(name, constant, chunk.getValueAt(constant));
	return (offset + 2) as Int;
}
