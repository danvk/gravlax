export enum ValueType {
	Bool,
	Nil,
	Number,
}

interface ValueBase {
	type: ValueType;
}
export interface BoolValue extends ValueBase {
	type: ValueType.Bool;
	as: boolean;
}
export interface NumberValue extends ValueBase {
	type: ValueType.Number;
	as: number;
}
export interface NilValue extends ValueBase {
	type: ValueType.Nil;
}
export type Value = BoolValue | NilValue | NumberValue;

export function boolValue(value: boolean): BoolValue {
	return { as: value, type: ValueType.Bool };
}
export const nilValue: NilValue = { type: ValueType.Nil };
export function numberValue(value: number): NumberValue {
	return { as: value, type: ValueType.Number };
}

// No need to implement ValueArray; it's just Value[].
