import { sprintf } from "sprintf-js";

import { Chunk, OpCode } from "./chunk.js";
import { DEBUG_TRACE_EXECUTION } from "./common.js";
import { compile } from "./compiler.js";
import { disassembleInstruction } from "./debug.js";
import { Int } from "./int.js";
import { assertUnreachable } from "./util.js";
import {
	NumberValue,
	ObjValue,
	Value,
	ValueType,
	boolValue,
	formatValue,
	nilValue,
	numberValue,
	printValue,
	valuesEqual,
} from "./value.js";
import {
	ObjType,
	asString,
	copyString,
	freeStrings,
	getIfObjOfType,
} from "./object.js";
import { freeObjects } from "./heap.js";

export enum InterpretResult {
	OK,
	CompileError,
	RuntimeError,
}

const STACK_MAX = 256;

function isFalsey(value: Value): boolean {
	return (
		value.type === ValueType.Nil || (value.type === ValueType.Bool && !value.as)
	);
}

export class VM {
	#chunk: Chunk;
	#ip: Int; // alternatively could be a Uint8Array
	#stack: Value[];
	#stackTop: number;
	#globals: Map<string, Value>;
	constructor() {
		this.#chunk = new Chunk();
		this.#ip = Int(0);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.#stack = new Array(STACK_MAX).fill(numberValue(-1));
		this.#stackTop = 0;
		this.#globals = new Map();
	}
	free() {
		this.#chunk.free();
		freeStrings();
		freeObjects();
		// Don't think we need to free this.#globals here.
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
	peek(distance: number): Value {
		return this.#stack[this.#stackTop - distance - 1];
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
					stack += "[ " + formatValue(value) + " ]";
				}
				console.log(stack);
				disassembleInstruction(chunk, ip);
			}
			const instruction = readByte() as OpCode;
			switch (instruction) {
				case OpCode.Jump: {
					const offset = readShort();
					ip = (ip + offset) as Int;
					break;
				}

				case OpCode.JumpIfFalse: {
					const offset = readShort();
					if (isFalsey(this.peek(0))) {
						ip = (ip + offset) as Int;
					}
					break;
				}

				case OpCode.Loop: {
					const offset = readShort();
					ip = (ip - offset) as Int;
					break;
				}

				case OpCode.Return:
					return InterpretResult.OK;

				case OpCode.Print:
					printValue(this.pop());
					break;

				case OpCode.Constant: {
					const constant = readConstant();
					this.push(constant);
					break;
				}

				case OpCode.Negate:
					if (this.peek(0).type !== ValueType.Number) {
						runtimeError("Operand must be a number.");
						return InterpretResult.RuntimeError;
					}
					this.push(numberValue(-(this.pop() as NumberValue).as));
					break;

				case OpCode.Nil:
					this.push(nilValue);
					break;
				case OpCode.True:
					this.push(boolValue(true));
					break;
				case OpCode.False:
					this.push(boolValue(false));
					break;

				case OpCode.Pop:
					this.pop();
					break;

				case OpCode.GetLocal: {
					const slot = readByte();
					this.push(this.#stack[slot]);
					break;
				}

				case OpCode.SetLocal: {
					const slot = readByte();
					this.#stack[slot] = this.peek(0);
					break;
				}

				case OpCode.GetGlobal: {
					const name = readString();
					const value = this.#globals.get(name.chars);
					if (!value) {
						runtimeError(`Undefined Variable ${name.chars}`);
						return InterpretResult.RuntimeError;
					}
					this.push(value);
					break;
				}

				case OpCode.DefineGlobal: {
					const name = readString();
					this.#globals.set(name.chars, this.peek(0));
					this.pop();
					break;
				}

				case OpCode.SetGlobal: {
					const name = readString();
					if (!this.#globals.has(name.chars)) {
						runtimeError(`Undefined Variable ${name.chars}`);
						return InterpretResult.RuntimeError;
					}
					this.#globals.set(name.chars, this.peek(0)); // no pop bc assignment is an expression

					break;
				}

				case OpCode.Equal: {
					const b = this.pop();
					const a = this.pop();
					this.push(boolValue(valuesEqual(a, b)));
					break;
				}

				case OpCode.Add: {
					if (
						this.peek(0).type === ValueType.Number &&
						this.peek(1).type === ValueType.Number
					) {
						const b = this.pop() as NumberValue;
						const a = this.pop() as NumberValue;
						this.push(numberValue(a.as + b.as));
					} else {
						const bString = getIfObjOfType(this.peek(0), ObjType.String);
						const aString = getIfObjOfType(this.peek(1), ObjType.String);

						if (aString && bString) {
							this.pop();
							this.pop();
							this.push(copyString(aString.chars + bString.chars));
						} else {
							runtimeError("Operands must be two numbers or two strings.");
							return InterpretResult.RuntimeError;
						}
					}
					break;
				}

				case OpCode.Greater:
				case OpCode.Less:
				case OpCode.Subtract:
				case OpCode.Multiply:
				case OpCode.Divide: {
					const [bv, av] = [this.pop(), this.pop()];
					if (av.type !== ValueType.Number || bv.type !== ValueType.Number) {
						runtimeError("Operands must be numbers.");
						return InterpretResult.RuntimeError;
					}
					const [a, b] = [av.as, bv.as];
					let v;
					switch (instruction) {
						case OpCode.Subtract:
							v = numberValue(a - b);
							break;
						case OpCode.Multiply:
							v = numberValue(a * b);
							break;
						case OpCode.Divide:
							v = numberValue(a / b);
							break;
						case OpCode.Greater:
							v = boolValue(a > b);
							break;
						case OpCode.Less:
							v = boolValue(a < b);
							break;
						default:
							assertUnreachable(instruction);
					}
					this.push(v);
					break;
				}

				case OpCode.Not:
					this.push(boolValue(isFalsey(this.pop())));
					break;

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

		function readShort() {
			const a = readByte();
			const b = readByte();
			return (a << 8) | b;
		}

		function readString() {
			return asString(readConstant());
		}

		function runtimeError(format: string, ...args: any[]) {
			console.error(sprintf(format, args));
			const instruction = ip - 1;
			const line = chunk.lines[instruction];
			console.error(`[line ${line} in script]`);
		}
	}
}
