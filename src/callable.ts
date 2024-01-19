import { Interpreter } from "./interpreter.js";

export abstract class LoxCallable {
	abstract arity(): number;
	abstract call(interpreter: Interpreter, args: unknown[]): unknown;
}
