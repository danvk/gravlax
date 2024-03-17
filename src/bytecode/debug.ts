import { sprintf } from "sprintf-js";

import { Chunk, OpCode } from "./chunk.js";
import { Int } from "./int.js";
import { assertUnreachable } from "./util.js";
import { formatValue } from "./value.js";

export function disassembleChunk(chunk: Chunk, name: string) {
	console.log(`== ${name} ==`);
	for (let offset = Int(0); offset < chunk.length; ) {
		offset = disassembleInstruction(chunk, offset);
	}
}

const simpleInstructions = {
	[OpCode.Return]: "OP_RETURN",
	[OpCode.Negate]: "OP_NEGATE",
	[OpCode.Add]: "OP_ADD",
	[OpCode.Subtract]: "OP_SUBTRACT",
	[OpCode.Multiply]: "OP_MULTIPLY",
	[OpCode.Divide]: "OP_DIVIDE",
	[OpCode.False]: "OP_FALSE",
	[OpCode.True]: "OP_TRUE",
	[OpCode.Nil]: "OP_NIL",
	[OpCode.Not]: "OP_NOT",
	[OpCode.Less]: "OP_LESS",
	[OpCode.Greater]: "OP_GREATER",
	[OpCode.Equal]: "OP_EQUAL",
} satisfies Partial<Record<OpCode, string>>;

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
		// Would be nice to eliminate the duplication with simpleInstructions
		case OpCode.Return:
		case OpCode.Negate:
		case OpCode.Add:
		case OpCode.Subtract:
		case OpCode.Multiply:
		case OpCode.Divide:
		case OpCode.False:
		case OpCode.True:
		case OpCode.Nil:
		case OpCode.Not:
		case OpCode.Less:
		case OpCode.Greater:
		case OpCode.Equal:
			return simpleInstruction(simpleInstructions[instruction], offset);
		case OpCode.Constant:
			return constantInstruction("OP_CONSTANT", chunk, offset);
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
		sprintf(
			"%-16s %4d '%s'",
			name,
			constant,
			formatValue(chunk.getValueAt(constant)),
		),
	);
	return (offset + 2) as Int;
}
