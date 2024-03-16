import { Chunk, OpCode } from "./chunk.js";
import { disassembleChunk } from "./debug.js";
import { Int } from "./int.js";
import { Value } from "./value.js";
import { VM } from "./vm.js";

export async function main() {
	const vm = new VM();
	const chunk = new Chunk();
	let constant = chunk.addConstant(Value(1.2));
	chunk.writeOp(OpCode.Constant, Int(123));
	chunk.writeByte(constant, Int(123));

	constant = chunk.addConstant(Value(3.4));
	chunk.writeOp(OpCode.Constant, Int(123));
	chunk.writeByte(constant, Int(123));

	chunk.writeOp(OpCode.Add, Int(123));

	constant = chunk.addConstant(Value(5.6));
	chunk.writeOp(OpCode.Constant, Int(123));
	chunk.writeByte(constant, Int(123));

	chunk.writeOp(OpCode.Divide, Int(123));
	chunk.writeOp(OpCode.Negate, Int(123));
	chunk.writeOp(OpCode.Return, Int(123));
	chunk.writeByte(constant, Int(123));
	disassembleChunk(chunk, "test chunk");

	console.log("executing...");
	vm.interpret(chunk);
	vm.free();
	chunk.free();
}
