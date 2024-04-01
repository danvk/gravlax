// There's a lot more ceremony around this in C.

import { Func } from "../ast.js";
import { Chunk } from "./chunk.js";
import { Pointer, alloc, deref, free } from "./heap.js";
import { assertUnreachable } from "./util.js";
import { ObjValue, Value, ValueType } from "./value.js";

export enum ObjType {
	String,
	Function,
}

export interface ObjFunction {
	type: ObjType.Function;
	arity: number;
	chunk: Chunk;
	name: ObjString | null;
}

export interface ObjString {
	type: ObjType.String;
	chars: string;
}

export type Obj = ObjString | ObjFunction;

export function derefObj<T extends Obj>(pointer: Pointer<T>): T {
	return deref(pointer);
}

export function getIfObjOfType<T extends ObjType>(
	value: Value,
	type: T,
): Extract<Obj, { type: T }> | null {
	if (value.type !== ValueType.Obj) {
		return null;
	}
	const obj = derefObj(value.obj);
	return obj.type === type ? (obj as Extract<Obj, { type: T }>) : null;
}

const strings = new Map<string, ObjValue>();

export function asString(value: Value) {
	const obj = getIfObjOfType(value, ObjType.String);
	if (!obj) {
		throw new Error(`Tried to use ${value} as string`);
	}
	return obj;
}

export function asFunction(value: Value) {
	const obj = getIfObjOfType(value, ObjType.Function);
	if (!obj) {
		throw new Error(`Tried to use ${value} as function`);
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

export function newFunction() {
	const fn: ObjFunction = {
		type: ObjType.Function,
		arity: 0,
		name: null,
		chunk: new Chunk(),
	};
	return alloc(fn);
}

export function freeFunction(object: Pointer<ObjFunction>) {
	const fn = derefObj(object);
	if (fn.type !== ObjType.Function) {
		throw new Error("freeing non-function as function");
	}
	fn.chunk.free();
	free(object);
}

export function freeObj(object: Pointer<Obj>) {
	const obj = derefObj(object);
	switch (obj.type) {
		case ObjType.String:
			//
			break;
		case ObjType.Function:
			freeFunction(object as Pointer<ObjFunction>);
			break;
		default:
			assertUnreachable(obj);
	}
}
