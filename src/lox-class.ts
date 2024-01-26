import { LoxCallable } from "./callable.js";
import { Interpreter } from "./interpreter.js";
import { LoxInstance } from "./lox-instance.js";
import { LoxValue } from "./lox-value.js";

// XXX interesting that "extends" and "implements" are both
// valid here, but the latter breaks instanceof.

export class LoxClass extends LoxCallable {
	name: string;
	constructor(name: string) {
		super();
		this.name = name;
	}
	arity(): number {
		return 0;
	}
	call(interpreter: Interpreter, args: LoxValue[]): LoxValue {
		const instance = new LoxInstance(this);
		return instance;
	}

	toString() {
		return this.name;
	}
}
