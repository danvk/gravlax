import { sprintf } from "sprintf-js";

import { Chunk, OpCode } from "./chunk.js";
import { DEBUG_TRACE_EXECUTION } from "./common.js";
import { compile } from "./compiler.js";
import { disassembleInstruction } from "./debug.js";
import { Int } from "./int.js";
import { assertUnreachable } from "./util.js";
import { Value } from "./value.js";

export enum InterpretResult {
	OK,
	CompileError,
	RuntimeError,
}

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
	interpret(source: string): InterpretResult {
		const chunk = compile(source);
		if (!chunk) {
			return InterpretResult.CompileError;
		}

		this.#chunk = chunk;
		this.#ip = Int(0);
		const result = this.run();
		chunk.free();
		return result;
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
					stack += sprintf("[ %s ]", value);
				}
				console.log(stack);
				disassembleInstruction(chunk, ip);
			}
			const instruction = readByte() as OpCode;
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

				case OpCode.Add:
				case OpCode.Subtract:
				case OpCode.Multiply:
				case OpCode.Divide: {
					const [b, a] = [this.pop(), this.pop()];
					let v;
					switch (instruction) {
						case OpCode.Add:
							v = a + b;
							break;
						case OpCode.Subtract:
							v = a - b;
							break;
						case OpCode.Multiply:
							v = a * b;
							break;
						case OpCode.Divide:
							v = a / b;
							break;
						default:
							assertUnreachable(instruction);
					}
					this.push(Value(v));
					break;
				}

				default:
					assertUnreachable(instruction);
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
