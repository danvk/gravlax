import { RuntimeError } from "./interpreter.js";
import { LoxValue } from "./lox-value.js";
import { Token } from "./token.js";

export class Environment {
	#enclosing?: Environment;
	#values: Map<string, LoxValue>;

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

	assign(name: Token, value: LoxValue) {
		if (this.#values.has(name.lexeme)) {
			this.#values.set(name.lexeme, value);
			return;
		}
		// resolution pass means that we needn't check #enclosing.
		throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
	}

	assignAt(distance: number, name: Token, value: LoxValue) {
		this.ancestor(distance).#values.set(name.lexeme, value);
	}

	define(name: string, value: LoxValue) {
		this.#values.set(name, value);
	}

	get(name: Token): LoxValue {
		const { lexeme } = name;
		const value = this.#values.get(lexeme);
		if (value !== undefined) {
			return value;
		}
		// resolution pass means that we needn't check #enclosing.
		throw new RuntimeError(name, `Undefined variable '${lexeme}'.`);
	}

	getAt(distance: number, name: string): LoxValue {
		const value = this.ancestor(distance).#values.get(name);
		if (value !== undefined) {
			return value;
		}
		throw new Error(`Resolution pass failed for ${name}`);
	}
}
