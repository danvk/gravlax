export type Value = number & { __brand: "value" };

// No need to implement ValueArray; it's just Value[].

export function Value(n: number): Value {
	return n as Value;
}
