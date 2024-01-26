import { LoxCallable } from "./callable.js";
import { Interpreter } from "./interpreter.js";
import { LoxFunction } from "./lox-function.js";
import { LoxInstance } from "./lox-instance.js";
import { LoxValue } from "./lox-value.js";

// XXX interesting that "extends" and "implements" are both
// valid here, but the latter breaks instanceof.

export class LoxClass extends LoxCallable {
	#methods: Map<string, LoxFunction>;
	name: string;

	constructor(name: string, methods: Map<string, LoxFunction>) {
		super();
		this.name = name;
		this.#methods = methods;
	}

	arity(): number {
		const initializer = this.findMethod("init");
		return initializer?.arity() ?? 0;
	}

	call(interpreter: Interpreter, args: LoxValue[]): LoxValue {
		const instance = new LoxInstance(this);
		const initializer = this.findMethod("init");
		if (initializer) {
			initializer.bindThis(instance).call(interpreter, args);
		}
		return instance;
	}

	findMethod(name: string) {
		return this.#methods.get(name);
	}

	toString() {
		return this.name;
	}
}
