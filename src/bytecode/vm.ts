import util from "node:util";

import { Chunk, OpCode } from "./chunk.js";
import { disassembleInstruction } from "./debug.js";
import { Int } from "./int.js";
import { Value } from "./value.js";

export enum InterpretResult {
	OK,
	COMPILE_ERROR,
	RUNTIME_ERROR,
}

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const DEBUG_TRACE_EXECUTION: boolean = true;

const STACK_MAX = 256;

export class VM {
	#chunk: Chunk;
	#ip: Int; // alternatively could be a Uint8Array
	#stack: Value[];
	#stackTop: number;
	constructor() {
		this.#chunk = new Chunk();
		this.#ip = Int(0);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.#stack = new Array(STACK_MAX).fill(Value(-1));
		this.#stackTop = 0;
	}
	free() {
		this.#chunk.free();
	}
	interpret(chunk: Chunk): InterpretResult {
		this.#chunk = chunk;
		this.#ip = Int(0);
		return this.run();
	}
	pop(): Value {
		this.#stackTop--;
		return this.#stack[this.#stackTop];
	}
	push(value: Value) {
		this.#stack[this.#stackTop] = value;
		this.#stackTop++;
	}
	resetStack() {
		this.#stackTop = 0;
	}
	run(): InterpretResult {
		const chunk = this.#chunk;
		let ip = this.#ip;
		while (true) {
			if (DEBUG_TRACE_EXECUTION) {
				let stack = "          ";
				for (const value of this.#stack.slice(0, this.#stackTop)) {
					stack += util.format("[ %s ]", value);
				}
				console.log(stack);
				disassembleInstruction(chunk, ip);
			}
			const instruction = readByte();
			switch (instruction) {
				case OpCode.Return:
					console.log(this.pop());
					return InterpretResult.OK;
				case OpCode.Constant: {
					const constant = readConstant();
					this.push(constant);
					break;
				}
				case OpCode.Negate:
					this.push(Value(-this.pop()));
					break;
			}
		}

		function readByte() {
			const byte = chunk.getByteAt(ip);
			ip++; // interesting that this is OK!
			return byte;
		}
		function readConstant() {
			return chunk.getValueAt(readByte());
		}
	}
}
