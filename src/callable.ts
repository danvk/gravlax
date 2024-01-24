import { Interpreter } from "./interpreter.js";
import { LoxValue } from "./lox-value.js";

export abstract class LoxCallable {
	abstract arity(): number;
	abstract call(interpreter: Interpreter, args: LoxValue[]): LoxValue;
}
