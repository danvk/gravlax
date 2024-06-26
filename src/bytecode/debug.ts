import { sprintf } from "sprintf-js";

import { Chunk, OpCode } from "./chunk.js";
import { Int } from "./int.js";
import { asFunction } from "./object.js";
import { assertUnreachable } from "./util.js";
import { formatValue } from "./value.js";

export function disassembleChunk(chunk: Chunk, name: string) {
	console.log(`== ${name} ==`);
	for (let offset = Int(0); offset < chunk.length; ) {
		offset = disassembleInstruction(chunk, offset);
	}
}

const simpleInstructions = {
	[OpCode.Add]: "OP_ADD",
	[OpCode.CloseUpvalue]: "OP_CLOSE_UPVALUE",
	[OpCode.Divide]: "OP_DIVIDE",
	[OpCode.Equal]: "OP_EQUAL",
	[OpCode.False]: "OP_FALSE",
	[OpCode.Greater]: "OP_GREATER",
	[OpCode.Less]: "OP_LESS",
	[OpCode.Multiply]: "OP_MULTIPLY",
	[OpCode.Negate]: "OP_NEGATE",
	[OpCode.Nil]: "OP_NIL",
	[OpCode.Not]: "OP_NOT",
	[OpCode.Pop]: "OP_POP",
	[OpCode.Print]: "OP_PRINT",
	[OpCode.Return]: "OP_RETURN",
	[OpCode.Subtract]: "OP_SUBTRACT",
	[OpCode.True]: "OP_TRUE",
} satisfies Partial<Record<OpCode, string>>;

const constantInstructions = {
	[OpCode.Constant]: "OP_CONSTANT",
	[OpCode.DefineGlobal]: "OP_DEFINE_GLOBAL",
	[OpCode.GetGlobal]: "OP_GET_GLOBAL",
	[OpCode.SetGlobal]: "OP_SET_GLOBAL",
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
		case OpCode.Print:
		case OpCode.Add:
		case OpCode.Subtract:
		case OpCode.Multiply:
		case OpCode.Divide:
		case OpCode.False:
		case OpCode.True:
		case OpCode.Nil:
		case OpCode.Pop:
		case OpCode.Not:
		case OpCode.Less:
		case OpCode.Greater:
		case OpCode.Equal:
		case OpCode.CloseUpvalue:
			return simpleInstruction(simpleInstructions[instruction], offset);
		case OpCode.Constant:
		case OpCode.DefineGlobal:
		case OpCode.GetGlobal:
		case OpCode.SetGlobal:
			return constantInstruction(
				constantInstructions[instruction],
				chunk,
				offset,
			);
		case OpCode.GetLocal:
			return byteInstruction("OP_GET_LOCAL", chunk, offset);
		case OpCode.SetLocal:
			return byteInstruction("OP_SET_LOCAL", chunk, offset);
		case OpCode.GetUpvalue:
			return byteInstruction("OP_GET_UPVALUE", chunk, offset);
		case OpCode.SetUpvalue:
			return byteInstruction("OP_SET_UPVALUE", chunk, offset);
		case OpCode.Call:
			return byteInstruction("OP_CALL", chunk, offset);
		case OpCode.Closure: {
			offset++;
			const constant = chunk.code[offset++];
			console.log(
				sprintf(
					"%-16s %4d %s",
					"OP_CLOSURE",
					constant,
					formatValue(chunk.constants[constant]),
				),
			);
			const fn = asFunction(chunk.constants[constant]);
			for (let j = 0; j < fn.upvalueCount; j++) {
				const isLocal = chunk.code[offset++];
				const index = chunk.code[offset++];
				console.log(
					sprintf(
						"%04d      |                     %s %d",
						offset - 2,
						isLocal ? "local" : "upvalue",
						index,
					),
				);
			}
			return offset;
		}
		case OpCode.Jump:
			return jumpInstruction("OP_JUMP", 1, chunk, offset);
		case OpCode.JumpIfFalse:
			return jumpInstruction("OP_JUMP_IF_FALSE", 1, chunk, offset);
		case OpCode.Loop:
			return jumpInstruction("OP_LOOP", -1, chunk, offset);

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

export function byteInstruction(name: string, chunk: Chunk, offset: Int) {
	const slot = chunk.getByteAt((offset + 1) as Int);
	console.log(sprintf("%-16s %4d", name, slot));
	return (offset + 2) as Int;
}

export function jumpInstruction(
	name: string,
	sign: number,
	chunk: Chunk,
	offset: Int,
) {
	const a = chunk.getByteAt((offset + 1) as Int);
	const b = chunk.getByteAt((offset + 2) as Int);
	const jump = (a << 8) | b;
	console.log(
		sprintf("%-16s %4d -> %d", name, offset, offset + 3 + sign * jump),
	);
	return (offset + 3) as Int;
}
export function constantInstruction(name: string, chunk: Chunk, offset: Int) {
	const constant = chunk.getByteAt((offset + 1) as Int);
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
