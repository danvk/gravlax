import { Func } from "./ast.js";
import { LoxCallable } from "./callable.js";
import { Environment } from "./environment.js";
import { Interpreter, ReturnCall } from "./interpreter.js";
import { LoxInstance } from "./lox-instance.js";
import { LoxValue } from "./lox-value.js";

// XXX interesting that you can change "extends" to "implements" here.
// This type checks but doesn't work at runtime.
export class LoxFunction extends LoxCallable {
	#isInitializer: boolean;
	closure: Environment;
	declaration: Func;

	constructor(declaration: Func, closure: Environment, isInitializer: boolean) {
		super();
		this.declaration = declaration;
		this.closure = closure;
		this.#isInitializer = isInitializer;
	}
	arity(): number {
		return this.declaration.params.length;
	}

	bindThis(instance: LoxInstance) {
		const env = new Environment(this.closure);
		env.define("this", instance);
		return new LoxFunction(this.declaration, env, this.#isInitializer);
	}

	// Why, oh why, do I need type annotations here?
	call(interpreter: Interpreter, args: LoxValue[]): LoxValue {
		const env = new Environment(this.closure);
		for (const [i, param] of this.declaration.params.entries()) {
			env.define(param.lexeme, args[i]);
		}
		try {
			interpreter.executeBlock(this.declaration.body, env);
		} catch (returnValue) {
			if (returnValue instanceof ReturnCall) {
				return returnValue.value;
			}
			throw returnValue;
		}
		if (this.#isInitializer) {
			return this.closure.getAt(0, "this");
		}
		return null;
	}

	toString() {
		return `<fn ${this.declaration.name.lexeme}>`;
	}
}
