import { Chunk, OpCode } from "./chunk.js";
import { disassembleChunk } from "./debug.js";
import { Int } from "./int.js";
import { Value } from "./value.js";

export async function main() {
	const chunk = new Chunk();
	const constant = chunk.addConstant(Value(1.2));
	chunk.writeOp(OpCode.Constant, Int(123));
	chunk.writeOp(OpCode.Return, Int(123));
	chunk.writeByte(constant, Int(123));
	disassembleChunk(chunk, "test chunk");
	chunk.free();
}
