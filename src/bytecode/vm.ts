import { sprintf } from "sprintf-js";

import { OpCode } from "./chunk.js";
import { DEBUG_TRACE_EXECUTION } from "./common.js";
import { compile } from "./compiler.js";
import { disassembleInstruction } from "./debug.js";
import { Pointer, alloc, deref, freeObjects, setPointer } from "./heap.js";
import { Int } from "./int.js";
import {
	NativeFn,
	ObjClosure,
	ObjType,
	ObjUpvalue,
	ObjUpvalueOpen,
	asClosure,
	asFunction,
	asNative,
	asString,
	copyString,
	freeStrings,
	getIfObjOfType,
	newClosure,
	newNative,
	newUpvalue,
} from "./object.js";
import { arrayWith, assertUnreachable } from "./util.js";
import {
	NumberValue,
	Value,
	ValueType,
	boolValue,
	formatValue,
	nilValue,
	numberValue,
	printValue,
	valuesEqual,
} from "./value.js";

export enum InterpretResult {
	OK,
	CompileError,
	RuntimeError,
}

const FRAMES_MAX = 64;
const STACK_MAX = FRAMES_MAX * 256;

export interface CallFrame {
	closure: ObjClosure;
	ip: Int;
	slotIndex: number; // book has slots: Pointer<Value>
}

function isFalsey(value: Value): boolean {
	return (
		value.type === ValueType.Nil || (value.type === ValueType.Bool && !value.as)
	);
}

const clockNative: NativeFn = () => {
	return numberValue(Date.now() / 1000);
};

export class VM {
	// #chunk: Chunk;
	#frameCount: number;
	#frames: CallFrame[];
	#globals: Map<string, Value>;
	#openUpValues: Pointer<ObjUpvalue> | null;
	// #ip: Int; // alternatively could be a Uint8Array
	#stack: Value[];
	#stackTop: number;
	constructor() {
		// this.#chunk = new Chunk();
		// this.#ip = Int(0);

		this.#stack = arrayWith(STACK_MAX, () => numberValue(-1));
		this.#stackTop = 0;
		this.#globals = new Map();
		this.#frameCount = 0;
		this.#frames = arrayWith(
			FRAMES_MAX,
			(): CallFrame => ({
				closure: null as unknown as ObjClosure,
				ip: Int(0),
				slotIndex: 0,
			}),
		);
		this.#openUpValues = null;
		this.defineNative("clock", clockNative);
	}
	defineNative(name: string, fn: NativeFn) {
		this.push(copyString(name));
		const nativeObj: Value = { obj: newNative(fn), type: ValueType.Obj };
		this.push(nativeObj);
		this.#globals.set(name, nativeObj);
		this.pop();
		this.pop();
	}
	free() {
		// this.#chunk.free();
		freeStrings();
		freeObjects();
		// Don't think we need to free this.#globals here.
	}

	interpret(source: string): InterpretResult {
		const fnPtr = compile(source);
		if (!fnPtr) {
			return InterpretResult.CompileError;
		}
		this.push({ obj: fnPtr, type: ValueType.Obj });
		const closure = newClosure(deref(fnPtr));
		this.pop();
		this.push({ obj: closure, type: ValueType.Obj });
		const frame = this.#frames[this.#frameCount++];
		// book calls call(fnPtr, 0) here.
		frame.closure = deref(closure);
		frame.ip = Int(0); // book has fn.chunk.code
		frame.slotIndex = this.#stackTop; // book has vm.stack
		return this.run();
	}
	// TODO: consider making these stack methods inline functions instead
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
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const vm = this;
		let frame = this.#frames[this.#frameCount - 1];
		while (true) {
			if (DEBUG_TRACE_EXECUTION) {
				let stack = "          ";
				for (const value of this.#stack.slice(0, this.#stackTop)) {
					stack += "[ " + formatValue(value) + " ]";
				}
				console.log(stack);
				disassembleInstruction(frame.closure.fn.chunk, frame.ip);
			}
			const instruction = readByte() as OpCode;
			switch (instruction) {
				case OpCode.Jump: {
					const offset = readShort();
					frame.ip = (frame.ip + offset) as Int;
					break;
				}

				case OpCode.JumpIfFalse: {
					const offset = readShort();
					if (isFalsey(this.peek(0))) {
						frame.ip = (frame.ip + offset) as Int;
					}
					break;
				}

				case OpCode.Loop: {
					const offset = readShort();
					frame.ip = (frame.ip - offset) as Int;
					break;
				}

				case OpCode.Call: {
					const argCount = readByte();
					if (!callValue(this.peek(argCount), argCount)) {
						return InterpretResult.RuntimeError;
					}
					frame = this.#frames[this.#frameCount - 1];
					break;
				}

				case OpCode.Closure: {
					const fn = asFunction(readConstant());
					const obj = newClosure(fn);
					const closure = deref(obj);
					this.push({ obj, type: ValueType.Obj });
					for (let i = 0; i < closure.upvalues.length; i++) {
						const isLocal = readByte();
						const index = readByte();
						if (isLocal) {
							closure.upvalues[i] = captureUpvalue(frame.slotIndex + index);
						} else {
							closure.upvalues[i] = frame.closure.upvalues[index];
						}
					}
					break;
				}

				case OpCode.CloseUpvalue: {
					closeUpvalues(vm.#stackTop - 1);
					this.pop();
					break;
				}

				case OpCode.Return: {
					const result = this.pop();
					// console.log("closeUpvalues", frame.slotIndex);
					closeUpvalues(frame.slotIndex);
					vm.#frameCount--;
					if (vm.#frameCount == 0) {
						this.pop();
						return InterpretResult.OK;
					}
					vm.#stackTop = frame.slotIndex;
					this.push(result);
					frame = vm.#frames[vm.#frameCount - 1];
					break;
				}

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
					this.push(this.#stack[frame.slotIndex + slot]);
					break;
				}

				case OpCode.SetLocal: {
					const slot = readByte();
					this.#stack[frame.slotIndex + slot] = this.peek(0);
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

				case OpCode.GetUpvalue: {
					const slot = readByte();
					const upvalue = deref(frame.closure.upvalues[slot]);
					// console.log("getUpvalue", upvalue);
					if ("stackIndex" in upvalue) {
						this.push(this.#stack[upvalue.stackIndex]);
					} else {
						this.push(deref(upvalue.location));
					}
					break;
				}

				case OpCode.SetUpvalue: {
					const slot = readByte();
					const upvalue = deref(frame.closure.upvalues[slot]);
					if ("stackIndex" in upvalue) {
						this.#stack[upvalue.stackIndex] = this.peek(0);
					} else {
						setPointer(upvalue.location, this.peek(0));
					}
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
			// XXX this diverges from the book. Their frame.ip is a pointer, but
			//     mine is is an offset from the chunk start.
			const byte = frame.closure.fn.chunk.getByteAt(frame.ip);
			frame.ip++; // interesting that this is OK!
			return byte;
		}

		function readConstant() {
			return frame.closure.fn.chunk.getValueAt(readByte());
		}

		function readShort() {
			const a = readByte();
			const b = readByte();
			return (a << 8) | b;
		}

		function readString() {
			return asString(readConstant());
		}

		function runtimeError(format: string, ...args: unknown[]) {
			console.error(sprintf(format, args));
			for (let i = vm.#frameCount - 1; i >= 0; i--) {
				const frame = vm.#frames[i];
				const fn = frame.closure.fn;
				const line = fn.chunk.lines[frame.ip - 1];
				const fnName = fn.name ? fn.name.chars + "()" : "script";
				console.error(`[line ${line} in ${fnName}]`);
			}
			vm.resetStack();
		}

		function call(closure: ObjClosure, argCount: number) {
			const func = closure.fn;
			if (argCount !== func.arity) {
				runtimeError(`Expected ${func.arity} arguments but got ${argCount}`);
				return false;
			}
			if (vm.#frameCount === FRAMES_MAX) {
				runtimeError("Stack overflow.");
				return false;
			}
			frame = vm.#frames[vm.#frameCount++];
			frame.closure = closure;
			frame.ip = Int(0);
			frame.slotIndex = vm.#stackTop - argCount - 1;
			return true;
		}

		function callValue(callee: Value, argCount: number) {
			if (callee.type === ValueType.Obj) {
				const obj = deref(callee.obj);
				switch (obj.type) {
					case ObjType.Closure:
						return call(asClosure(callee), argCount);
					case ObjType.Native: {
						const native = asNative(callee);
						const result = native.fn(argCount, vm.#stack.slice(-argCount));
						vm.#stackTop -= argCount + 1;
						vm.push(result);
						return true;
					}
					default:
						break; // non-callable object type
				}
			}
			runtimeError("Can only call functions and classes.");
			return false;
		}

		function captureUpvalue(local: number): Pointer<ObjUpvalue> {
			let prevUpvalue: Pointer<ObjUpvalue> | null = null;
			let upvalue = vm.#openUpValues;
			while (
				upvalue !== null &&
				// I _think_ this will work? Book doesn't need the typeof check.
				(deref(upvalue) as ObjUpvalueOpen).stackIndex > local
			) {
				prevUpvalue = upvalue;
				upvalue = deref(upvalue).next;
			}

			if (
				upvalue !== null &&
				(deref(upvalue) as ObjUpvalueOpen).stackIndex === local
			) {
				return upvalue;
			}

			const createdUpvalue = newUpvalue(local);
			deref(createdUpvalue).next = upvalue;
			if (prevUpvalue === null) {
				vm.#openUpValues = createdUpvalue;
			} else {
				deref(prevUpvalue).next = createdUpvalue;
			}
			return createdUpvalue;
		}

		function closeUpvalues(last: number) {
			// console.log("openUpValues:", vm.#openUpValues);
			while (
				vm.#openUpValues !== null &&
				(deref(vm.#openUpValues) as ObjUpvalueOpen).stackIndex >= last
			) {
				// console.log("popping upvalue");
				const upvalue = vm.#openUpValues;
				const value = vm.#stack[(deref(upvalue) as ObjUpvalueOpen).stackIndex];
				// console.log("upvalue value:", formatValue(value));
				const ptr = alloc(value);
				setPointer(upvalue, {
					location: ptr,
					next: deref(upvalue).next,
					type: ObjType.Upvalue,
				});
				vm.#openUpValues = deref(upvalue).next;
			}
		}
	}
}
