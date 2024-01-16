import { RuntimeError } from "./interpreter.js";
import { Token } from "./token.js";

export class Environment {
	#enclosing?: Environment;
	#values: Map<string, unknown>;

	constructor(enclosing?: Environment) {
		this.#values = new Map();
		this.#enclosing = enclosing;
	}

	assign(name: Token, value: unknown) {
		if (this.#values.has(name.lexeme)) {
			this.#values.set(name.lexeme, value);
			return;
		} else if (this.#enclosing) {
			this.#enclosing.assign(name, value);
			return;
		}
		throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
	}

	define(name: string, value: unknown) {
		this.#values.set(name, value);
	}

	get(name: Token): unknown {
		const { lexeme } = name;
		if (this.#values.has(lexeme)) {
			// TODO: could check for undefined instead
			return this.#values.get(lexeme);
		}
		if (this.#enclosing) {
			return this.#enclosing.get(name);
		}
		throw new RuntimeError(name, `Undefined variable '${lexeme}'.`);
	}
}
