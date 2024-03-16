import { Int, assertU8 } from "./types.js";

export enum OpCode {
	Return = 0,
}

// XXX is there a more idiomatic way to do dynamic arrays?
export class Chunk {
	#code: Uint8Array;
	#count: number;

	constructor() {
		this.#code = new Uint8Array();
		this.#count = 0;
	}

	#grow() {
		// This will always copy; is there a way to emulate reallocate()?
		const oldCapacity = this.#code.byteLength;
		const newCapacity = oldCapacity < 8 ? 8 : oldCapacity * 2;
		const newCode = new Uint8Array(newCapacity);
		newCode.set(this.#code);
		this.#code = newCode;
	}

	free() {
		// XXX duplication w/ constructor to avoid "not definitely assigned" errors
		this.#code = new Uint8Array();
		this.#count = 0;
	}

	getByteAt(n: Int): Int {
		return this.#code[n] as Int;
	}

	writeByte(byte: Int) {
		assertU8(byte);
		if (this.#code.byteLength < this.#count + 1) {
			this.#grow();
		}
		this.#code[this.#count] = byte;
		this.#count += 1;
	}

	get length() {
		return this.#count;
	}
}
