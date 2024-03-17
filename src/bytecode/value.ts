import util from "node:util";
import { assertUnreachable } from "./util.js";
import { Pointer } from "./heap.js";
import { ObjType, derefObj, getIfObjOfType } from "./object.js";

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
	obj: Pointer;
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
			const aStr = getIfObjOfType(a, ObjType.String);
			const bStr = getIfObjOfType(b, ObjType.String);
			if (!aStr || !bStr) {
				throw new Error(`Only support strings for now.`);
			}
			return aStr.chars === bStr.chars;
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

export function formatObj(value: ObjValue) {
	const obj = derefObj(value.obj);
	switch (obj.type) {
		case ObjType.String:
			return obj.chars;
		// XXX weird that a one-case switch in TS isn't exhaustive
		// default:
		// 	assertUnreachable(obj);
	}
}

// No need to implement ValueArray; it's just Value[].
