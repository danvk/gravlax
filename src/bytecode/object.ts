// There's a lot more ceremony around this in C.

import { Pointer, alloc, deref, free } from "./heap.js";
import { ObjValue, Value, ValueType } from "./value.js";

export enum ObjType {
	String,
}

export interface ObjString {
	type: ObjType.String;
	chars: string;
}

export type Obj = ObjString;

export function derefObj(pointer: Pointer): Obj {
	return deref(pointer) as Obj;
}

export function getIfObjOfType(value: Value, type: ObjType): Obj | null {
	if (value.type !== ValueType.Obj) {
		return null;
	}
	const obj = derefObj(value.obj);
	return obj.type === type ? obj : null;
}

const strings = new Map<string, ObjValue>();

export function asString(value: Value) {
	const obj = getIfObjOfType(value, ObjType.String);
	if (!obj) {
		throw new Error(`Tried to use ${value} as string`);
	}
	return obj;
}

export function copyString(chars: string): ObjValue {
	const interned = strings.get(chars);
	if (interned) {
		return interned;
	}
	const objStr: ObjString = { type: ObjType.String, chars };
	const pointer = alloc(objStr);
	const obj: ObjValue = { type: ValueType.Obj, obj: pointer };
	strings.set(chars, obj);
	return obj;
}

/** Free interned strings */
export function freeStrings() {
	for (const value of strings.values()) {
		free(value.obj);
	}
}
