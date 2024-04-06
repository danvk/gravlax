import util from "node:util";

import { Pointer } from "./heap.js";
import { Obj } from "./object.js";
import { formatObj } from "./object.js";
import { assertUnreachable } from "./util.js";

export enum ValueType {
	Bool,
	Nil,
	Number,
	Obj,
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
export interface ObjValue extends ValueBase {
	type: ValueType.Obj;
	obj: Pointer<Obj>;
}
export type Value = BoolValue | NilValue | NumberValue | ObjValue;

export function boolValue(value: boolean): BoolValue {
	return { as: value, type: ValueType.Bool };
}
export const nilValue: NilValue = { type: ValueType.Nil };
export function numberValue(value: number): NumberValue {
	return { as: value, type: ValueType.Number };
}

export function valuesEqual(a: Value, b: Value) {
	if (a.type !== b.type) {
		return false;
	}
	switch (a.type) {
		case ValueType.Nil:
			return true;
		case ValueType.Bool:
		case ValueType.Number:
			return a.as === (b as typeof a).as;
		case ValueType.Obj:
			return a.obj === (b as typeof a).obj;
	}
}

export function formatValue(value: Value) {
	switch (value.type) {
		case ValueType.Bool:
		case ValueType.Number:
			return util.format(value.as);
		case ValueType.Nil:
			return "nil";
		case ValueType.Obj:
			return formatObj(value);
		default:
			assertUnreachable(value);
	}
}

export function printValue(value: Value) {
	console.log(formatValue(value));
}
