import { Func } from "./ast.js";
import { LoxCallable } from "./callable.js";
import { Environment } from "./environment.js";
import { Interpreter, ReturnCall } from "./interpreter.js";

// XXX interesting that you can change "extends" to "implements" here.
// This type checks but doens't work at runtime.
export class LoxFunction extends LoxCallable {
	declaration: Func;
	constructor(declaration: Func) {
		super();
		this.declaration = declaration;
	}
	arity(): number {
		return this.declaration.params.length;
	}

	call(interpreter: Interpreter, args: unknown[]): unknown {
		const env = new Environment(interpreter.globals);
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
	}

	toString() {
		return `<fn ${this.declaration.name.lexeme}>`;
	}
}
