import { RuntimeError } from "./interpreter.js";
import { Token } from "./token.js";

export class Environment {
	#enclosing?: Environment;
	#values: Map<string, unknown>;

	constructor(enclosing?: Environment) {
		this.#values = new Map();
		this.#enclosing = enclosing;
	}

	ancestor(distance: number): Environment {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		let env: Environment = this;
		for (let i = 0; i < distance; i++) {
			const enclosing = env.#enclosing;
			if (!enclosing) {
				throw new Error("Tried to go past last ancestor!");
			}
			env = enclosing;
		}
		return env;
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

	assignAt(distance: number, name: Token, value: unknown) {
		this.ancestor(distance).#values.set(name.lexeme, value);
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

	getAt(distance: number, name: string): unknown {
		return this.ancestor(distance).#values.get(name);
	}
}
