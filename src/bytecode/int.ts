/** Not actually an int, but conveys intent. */
export type Int = { __brand: "int" } & number;
// XXX would this be better as a bigint?
// You can't assign a bigint to a Uint8Array slot.

export function assertU8(byte: number): asserts byte is Int {
	if (byte < 0 || byte > 255 || !Number.isInteger(byte)) {
		throw new Error(`Invalid byte ${byte}`);
	}
}

export function assertI8(byte: number): asserts byte is Int {
	if (byte < -128 || byte > 127 || !Number.isInteger(byte)) {
		throw new Error(`Invalid byte ${byte}`);
	}
}

export function Int(byte: number): Int {
	assertI8(byte);
	return byte;
}

export function UInt8(byte: number): Int {
	assertU8(byte);
	return byte;
}

export function addInts(a: Int, b: Int): Int {
	return (a + b) as Int;
}

export function hex(x: Int, len: number): string {
	let s = x.toString(16);
	while (s.length < len) {
		s = "0" + s;
	}
	return s;
}
