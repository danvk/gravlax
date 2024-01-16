import { RuntimeError } from "./interpreter.js";
import { Token } from "./token.js";

export class Environment {
	#values: Map<string, unknown>;
	constructor() {
		this.#values = new Map();
	}

	define(name: string, value: unknown) {
		this.#values.set(name, value);
	}

	get(name: Token) {
		const { lexeme } = name;
		if (this.#values.has(lexeme)) {
			// TODO: could check for undefined instead
			return this.#values.get(lexeme);
		}
		throw new RuntimeError(name, `Undefined variable '${lexeme}'.`);
	}
}
