import { LoxClass } from "./lox-class.js";

export class LoxInstance {
	#klass: LoxClass;
	constructor(klass: LoxClass) {
		this.#klass = klass;
	}

	toString() {
		return `${this.#klass.name} instance`;
	}
}
