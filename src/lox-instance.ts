import { RuntimeError } from "./interpreter.js";
import { LoxClass } from "./lox-class.js";
import { LoxValue } from "./lox-value.js";
import { Token } from "./token.js";

export class LoxInstance {
	#fields = new Map<string, LoxValue>();
	#klass: LoxClass;
	constructor(klass: LoxClass) {
		this.#klass = klass;
	}

	get(name: Token): LoxValue {
		const { lexeme } = name;
		const val = this.#fields.get(lexeme);
		if (val !== undefined) {
			return val;
		}
		const method = this.#klass.findMethod(lexeme);
		if (method) {
			return method.bindThis(this);
		}
		throw new RuntimeError(name, `Undefined property ${lexeme}.`);
	}

	set(name: Token, value: LoxValue) {
		this.#fields.set(name.lexeme, value);
	}

	toString() {
		return `${this.#klass.name} instance`;
	}
}
