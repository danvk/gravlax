import { Chunk, OpCode } from "./chunk.js";
import { Int, asInt, hex } from "./types.js";

export function disassembleChunk(chunk: Chunk, name: string) {
	console.log(`== ${name} ==`);
	for (let offset = asInt(0); offset < chunk.length; ) {
		offset = disassembleInstruction(chunk, offset);
	}
}

export function disassembleInstruction(chunk: Chunk, offset: Int): Int {
	// TODO: switch to sprintf-js
	console.log(hex(offset, 4)); // %04d
	const instruction = chunk.getByteAt(offset);
	switch (instruction) {
		case OpCode.Return:
			return simpleInstruction("OP_RETURN", offset);
		default:
			console.log("Unknown opcode", instruction);
			return (offset + 1) as Int;
	}
}

export function simpleInstruction(name: string, offset: Int) {
	console.log(name);
	return (offset + 1) as Int;
}
