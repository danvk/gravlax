import { Int, assertU8 } from "./int.js";
import { Value } from "./value.js";

export enum OpCode {
	Return,
	Constant,
	Negate,
	Print,
	Equal,
	Greater,
	Less,
	Add,
	Subtract,
	Multiply,
	Divide,
	Not,
	False,
	True,
	Nil,
}

// XXX is there a more idiomatic way to do dynamic arrays?
export class Chunk {
	#code: Uint8Array;
	#constants: Value[];
	#count: number;
	lines: Int[];

	constructor() {
		this.#code = new Uint8Array();
		this.#count = 0;
		this.#constants = [];
		this.lines = [];
	}

	#grow() {
		// This will always copy; is there a way to emulate reallocate()?
		const oldCapacity = this.#code.byteLength;
		const newCapacity = oldCapacity < 8 ? 8 : oldCapacity * 2;
		const newCode = new Uint8Array(newCapacity);
		newCode.set(this.#code);
		this.#code = newCode;
	}

	/** Returns offset of the constant in constants table. */
	addConstant(value: Value): Int {
		this.#constants.push(value);
		return (this.#constants.length - 1) as Int;
	}

	free() {
		// XXX duplication w/ constructor to avoid "not definitely assigned" errors
		this.#code = new Uint8Array();
		this.#count = 0;
		this.#constants = [];
		this.lines = [];
	}

	getByteAt(n: Int): Int {
		return this.#code[n] as Int;
	}

	getValueAt(n: Int): Value {
		return this.#constants[n];
	}

	writeByte(byte: Int, line: Int) {
		assertU8(byte);
		if (this.#code.byteLength < this.#count + 1) {
			this.#grow();
		}
		this.#code[this.#count] = byte;
		this.#count += 1;
		this.lines.push(line);
	}

	writeOp(op: OpCode, line: Int) {
		this.writeByte(op as Int, line);
	}

	writeOpAndByte(op: OpCode, byte: Int, line: Int) {
		this.writeOp(op, line);
		this.writeByte(byte, line);
	}

	get length() {
		return this.#count;
	}
}
