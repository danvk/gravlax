// There's a lot more ceremony around this in C.

import { Chunk } from "./chunk.js";
import { Pointer, alloc, deref, free } from "./heap.js";
import { assertUnreachable } from "./util.js";
import { ObjValue, Value, ValueType } from "./value.js";

export enum ObjType {
	String,
	Function,
	Native,
	Closure,
	Upvalue,
}

export interface ObjFunction {
	type: ObjType.Function;
	arity: number;
	upvalueCount: number;
	chunk: Chunk;
	name: ObjString | null;
}

export interface ObjClosure {
	type: ObjType.Closure;
	fn: ObjFunction;
	upvalues: Pointer<ObjUpvalue>[];
}

export interface ObjString {
	type: ObjType.String;
	chars: string;
}

export interface ObjUpvalueBase {
	type: ObjType.Upvalue;
	next: Pointer<ObjUpvalue> | null;
}

export interface ObjUpvalueOpen extends ObjUpvalueBase {
	stackIndex: number;
}
export interface ObjUpvalueClosed extends ObjUpvalueBase {
	location: Pointer<Value>;
}
export type ObjUpvalue = ObjUpvalueClosed | ObjUpvalueOpen;

export type NativeFn = (argCount: number, args: Value[]) => Value;

export interface ObjNative {
	type: ObjType.Native;
	fn: NativeFn;
}

export type Obj = ObjClosure | ObjFunction | ObjNative | ObjString | ObjUpvalue;

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

// TODO: factor out a helper for all of these
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

export function asNative(value: Value) {
	const obj = getIfObjOfType(value, ObjType.Native);
	if (!obj) {
		throw new Error(`Tried to use ${value} as native function`);
	}
	return obj;
}

export function asClosure(value: Value) {
	const obj = getIfObjOfType(value, ObjType.Closure);
	if (!obj) {
		throw new Error(`Tried to use ${value} as native function`);
	}
	return obj;
}

export function asUpvalue(value: Value) {
	const obj = getIfObjOfType(value, ObjType.Upvalue);
	if (!obj) {
		throw new Error(`Tried to use ${value} as upvalue`);
	}
	return obj;
}

export function copyString(chars: string): ObjValue {
	const interned = strings.get(chars);
	if (interned) {
		return interned;
	}
	const objStr: ObjString = { chars, type: ObjType.String };
	const pointer = alloc(objStr);
	const obj: ObjValue = { obj: pointer, type: ValueType.Obj };
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
		arity: 0,
		chunk: new Chunk(),
		name: null,
		type: ObjType.Function,
		upvalueCount: 0,
	};
	return alloc(fn);
}

export function newNative(fn: NativeFn) {
	const func: ObjNative = {
		fn,
		type: ObjType.Native,
	};
	return alloc(func);
}

export function newClosure(fn: ObjFunction) {
	return alloc<ObjClosure>({
		fn,
		type: ObjType.Closure,
		upvalues: Array(fn.upvalueCount).fill(null),
	});
}

export function newUpvalue(slot: number) {
	return alloc<ObjUpvalue>({
		next: null,
		stackIndex: slot,
		type: ObjType.Upvalue,
	});
}

export function freeFunction(object: Pointer<ObjFunction>) {
	const fn = derefObj(object);
	if (fn.type !== ObjType.Function) {
		throw new Error("freeing non-function as function");
	}
	fn.chunk.free();
	free(object);
}

export function freeObject(object: Pointer<Obj>) {
	const obj = derefObj(object);
	switch (obj.type) {
		case ObjType.String:
			//
			break;
		case ObjType.Function:
			freeFunction(object as Pointer<ObjFunction>);
			break;
		case ObjType.Native:
		case ObjType.Upvalue:
			free(object);
			break;
		case ObjType.Closure: {
			obj.upvalues = [];
			free(object);
			break;
		}
		default:
			assertUnreachable(obj);
	}
}

export function formatObj(value: ObjValue) {
	const obj = derefObj(value.obj);
	switch (obj.type) {
		case ObjType.String:
			return obj.chars;
		case ObjType.Function:
			return obj.name ? `<fn ${obj.name.chars}>` : "<script>";
		case ObjType.Native:
			return "<native fn>";
		case ObjType.Closure:
			return obj.fn.name ? `<fn ${obj.fn.name.chars}>` : "<script>";
		case ObjType.Upvalue:
			return "upvalue";
		// XXX weird that a one-case switch in TS isn't exhaustive
		default:
			assertUnreachable(obj);
	}
}
