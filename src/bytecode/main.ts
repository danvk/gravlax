import { Chunk, OpCode } from "./chunk.js";
import { disassembleChunk } from "./debug.js";
import { Int } from "./types.js";

export async function main() {
	const chunk = new Chunk();
	chunk.writeByte(OpCode.Return as Int);
	disassembleChunk(chunk, "test chunk");
	chunk.free();
}
