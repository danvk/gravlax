import { Func } from "./ast.js";
import { LoxCallable } from "./callable.js";
import { Environment } from "./environment.js";
import { Interpreter, ReturnCall } from "./interpreter.js";

// XXX interesting that you can change "extends" to "implements" here.
// This type checks but doens't work at runtime.
export class LoxFunction extends LoxCallable {
	closure: Environment;
	declaration: Func;

	constructor(declaration: Func, closure: Environment) {
		super();
		this.declaration = declaration;
		this.closure = closure;
	}
	arity(): number {
		return this.declaration.params.length;
	}

	call(interpreter: Interpreter, args: unknown[]): unknown {
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
		return null;
	}

	toString() {
		return `<fn ${this.declaration.name.lexeme}>`;
	}
}
