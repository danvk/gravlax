import { Binary, Call, Class, Expr, Stmt } from "./ast.js";
import { LoxCallable } from "./callable.js";
import { Environment } from "./environment.js";
import { LoxClass } from "./lox-class.js";
import { LoxFunction } from "./lox-function.js";
import { LoxInstance } from "./lox-instance.js";
import { CurrencyValue, LoxValue, isCurrency } from "./lox-value.js";
import { runtimeError } from "./main.js";
import { Token } from "./token.js";

// TODO: Crafting Interpreters makes this anonymous, can I do that?
class ClockFn extends LoxCallable {
	arity() {
		return 0;
	}
	call() {
		return Date.now();
	}
	toString() {
		return "<native fn>";
	}
}

export class ReturnCall extends Error {
	value: LoxValue;
	constructor(value: LoxValue) {
		super();
		this.value = value;
	}
}

type NumberOrCurrencyPair =
	| { left: CurrencyValue; right: CurrencyValue }
	| { left: number; right: number };

function applyOperatorToPair<R extends boolean | number>(
	pair: NumberOrCurrencyPair,
	op: (a: number, b: number) => R,
): LoxValue {
	if (typeof pair.left === "number") {
		// XXX why on earth doesn't pair.right get narrowed to number?
		// https://github.com/microsoft/TypeScript/issues/32399#issuecomment-639638245
		return op(pair.left, pair.right as number);
	} else {
		const value = op(pair.left.value, (pair.right as CurrencyValue).value);
		if (typeof value === "number") {
			return { currency: pair.left.currency, value };
		}
		return value;
	}
}

function applyToNumOrCurrency(
	val: CurrencyValue | number,
	fn: (val: number) => number,
): CurrencyValue | number {
	if (isCurrency(val)) {
		return { currency: val.currency, value: fn(val.value) };
	}
	return fn(val);
}

function assertUnreachable(x: never): never {
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	throw new Error(`Unreachable code reached! ${x}`);
}

// XXX using eslint quickfix to implement this interface did not work at all.

// TODO: try making this an object instead of a class so that the parameter
// types are inferred.
// https://github.com/azat-io/eslint-plugin-perfectionist/issues/102
/* eslint-disable perfectionist/sort-classes */
export class Interpreter {
	globals = new Environment();
	#environment = this.globals;
	#locals = new Map<Expr, number>();

	constructor() {
		this.globals.define("clock", new ClockFn());
	}

	resolve(expr: Expr, depth: number) {
		this.#locals.set(expr, depth);
	}

	#lookUpVariable(name: Token, expr: Expr): LoxValue {
		const distance = this.#locals.get(expr);
		if (distance !== undefined) {
			return this.#environment.getAt(distance, name.lexeme);
		}
		return this.globals.get(name);
	}

	binary(expr: Binary): LoxValue {
		const left = this.evaluate(expr.left);
		const right = this.evaluate(expr.right);
		const { operator } = expr;
		const pair = { left, right };
		switch (operator.type) {
			case "-":
				checkSameNumberOperands(operator, pair);
				return applyOperatorToPair(pair, (a, b) => a - b);
			case "/":
				checkNumberOrCurrencyOperand(operator, left);
				checkNumberOperand(operator, right);
				return applyToNumOrCurrency(left, (v) => v / right);
			case "*":
				checkNumberOrCurrencyOperand(operator, left);
				checkNumberOperand(operator, right);
				return applyToNumOrCurrency(left, (v) => v * right);
			case "+":
				// This looks kinda funny!
				if (typeof left === "string" && typeof right === "string") {
					return left + right;
				} else {
					try {
						checkSameNumberOperands(operator, pair);
					} catch (e) {
						if (e instanceof MixedCurrencyError) {
							throw e;
						}
						throw new RuntimeError(
							operator,
							`Operands must be two numbers/currencies or two strings.`,
						);
					}
					return applyOperatorToPair(pair, (a, b) => a + b);
				}
			case ">":
				checkSameNumberOperands(operator, pair);
				return applyOperatorToPair(pair, (a, b) => a > b);
			case ">=":
				checkSameNumberOperands(operator, pair);
				return applyOperatorToPair(pair, (a, b) => a >= b);
			case "<":
				checkSameNumberOperands(operator, pair);
				return applyOperatorToPair(pair, (a, b) => a < b);
			case "<=":
				checkSameNumberOperands(operator, pair);
				return applyOperatorToPair(pair, (a, b) => a <= b);
			case "==":
				return isEqual(left, right);
			case "!=":
				return !isEqual(left, right);
		}

		return null;
	}

	call(expr: Call): LoxValue {
		const callee = this.evaluate(expr.callee);
		const args = expr.args.map((arg) => this.evaluate(arg));
		if (!(callee instanceof LoxCallable)) {
			throw new RuntimeError(
				expr.paren,
				"Can only call functions and classes.",
			);
		}
		if (args.length != callee.arity()) {
			throw new RuntimeError(
				expr.paren,
				`Expected ${callee.arity()} arguments but got ${args.length}.`,
			);
		}
		return callee.call(this, args);
	}

	class(stmt: Class): void {
		this.#environment.define(stmt.name.lexeme, null);
		const methods = new Map<string, LoxFunction>();
		for (const method of stmt.methods) {
			const func = new LoxFunction(
				method,
				this.#environment,
				method.name.lexeme === "init",
			);
			methods.set(method.name.lexeme, func);
		}
		const klass = new LoxClass(stmt.name.lexeme, methods);
		this.#environment.assign(stmt.name, klass);
	}

	evaluate(expr: Expr): LoxValue {
		switch (expr.kind) {
			case "assign":
				const value = this.evaluate(expr.value);
				const distance = this.#locals.get(expr);
				if (distance !== undefined) {
					this.#environment.assignAt(distance, expr.name, value);
				} else {
					this.globals.assign(expr.name, value);
				}
				return value;

			case "binary":
				return this.binary(expr);

			case "call":
				return this.call(expr);

			case "get": {
				const obj = this.evaluate(expr.object);
				if (obj instanceof LoxInstance) {
					return obj.get(expr.name);
				}
				throw new RuntimeError(expr.name, "Only instances have properties.");
			}

			case "grouping":
				return this.evaluate(expr.expr);

			case "literal":
				return expr.value;

			case "logical":
				const left = this.evaluate(expr.left);
				if (expr.operator.type == "or") {
					if (isTruthy(left)) {
						return left;
					}
				} else {
					if (!isTruthy(left)) {
						return left;
					}
				}

				return this.evaluate(expr.right);

			case "set": {
				const obj = this.evaluate(expr.object);
				if (!(obj instanceof LoxInstance)) {
					throw new RuntimeError(expr.name, "Only instances have fields.");
				}
				const value = this.evaluate(expr.value);
				obj.set(expr.name, value);
				return value;
			}

			case "unary":
				const right = this.evaluate(expr.right);
				switch (expr.operator.type) {
					case "-":
						checkNumberOrCurrencyOperand(expr.operator, right);
						return applyToNumOrCurrency(right, (v) => -v);
					case "!":
						return !isTruthy(right);
				}
				throw new Error(`Unknown unary type ${expr.operator.type}`);

			case "this":
				return this.#lookUpVariable(expr.keyword, expr);

			case "var-expr":
				return this.#lookUpVariable(expr.name, expr);
		}
	}

	execute(stmt: Stmt): void {
		switch (stmt.kind) {
			case "block":
				this.executeBlock(stmt.statements, new Environment(this.#environment));
				break;

			case "class":
				this.class(stmt);
				break;

			case "expr":
				this.evaluate(stmt.expression);
				break;

			case "func":
				const func = new LoxFunction(stmt, this.#environment, false);
				this.#environment.define(stmt.name.lexeme, func);
				break;

			case "if":
				if (isTruthy(this.evaluate(stmt.condition))) {
					this.execute(stmt.thenBranch);
				} else if (stmt.elseBranch !== null) {
					this.execute(stmt.elseBranch);
				}
				break;

			case "print": {
				const value = this.evaluate(stmt.expression);
				console.log(stringify(value));
				break;
			}

			case "return": {
				const value = stmt.value && this.evaluate(stmt.value);
				throw new ReturnCall(value);
			}

			case "var-stmt": {
				let value = null;
				if (stmt.initializer) {
					value = this.evaluate(stmt.initializer);
				}
				this.#environment.define(stmt.name.lexeme, value);
				break;
			}

			case "while":
				while (isTruthy(this.evaluate(stmt.condition))) {
					this.execute(stmt.body);
				}
				break;

			default:
				assertUnreachable(stmt);
		}
	}

	executeBlock(stmts: Stmt[], environment: Environment): void {
		const prev = this.#environment;
		try {
			this.#environment = environment;
			for (const stmt of stmts) {
				this.execute(stmt);
			}
		} finally {
			// TODO: try doing this with a using() declaration
			// https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/#using-declarations-and-explicit-resource-management
			this.#environment = prev;
		}
	}

	interpret(statements: Stmt[]): void {
		try {
			for (const statement of statements) {
				this.execute(statement);
			}
		} catch (e) {
			if (e instanceof RuntimeError) {
				runtimeError(e);
			}
		}
	}
}
/* eslint-enable perfectionist/sort-classes */

export class RuntimeError extends Error {
	token: Token;
	constructor(token: Token, message: string) {
		super(message);
		this.token = token;
	}
}

export class MixedCurrencyError extends RuntimeError {}

function checkNumberOperand(
	operator: Token,
	operand: LoxValue,
): asserts operand is number {
	if (typeof operand === "number") {
		return;
	}
	throw new RuntimeError(operator, "Operand must be a number.");
}

function checkNumberOrCurrencyOperand(
	operator: Token,
	operand: LoxValue,
): asserts operand is CurrencyValue | number {
	if (typeof operand === "number" || isCurrency(operand)) {
		return;
	}
	throw new RuntimeError(operator, "Operand must be a number or currency.");
}

function checkSameNumberOperands(
	operator: Token,
	pair: { left: LoxValue; right: LoxValue },
): asserts pair is NumberOrCurrencyPair {
	const { left, right } = pair;
	if (typeof left === "number" && typeof right === "number") {
		return;
	} else if (isCurrency(left) && isCurrency(right)) {
		if (left.currency == right.currency) {
			return;
		}
		throw new MixedCurrencyError(
			operator,
			"Operands must be the same currency.",
		);
	}
	throw new RuntimeError(
		operator,
		"Operands must both be numbers or currencies.",
	);
}

// TODO: would be nice if this worked!
// function checkNumberOperands(
// 	operator: Token,
// 	operands: [unknown, unknown],
// ): asserts operands is [number, number] {
// 	const [left, right] = operands;
// 	checkNumberOperand(operator, left);
// 	checkNumberOperand(operator, right);
// }

export function isTruthy(val: LoxValue): boolean {
	if (val === null) {
		return false;
	}
	if (typeof val === "boolean") {
		return val;
	}
	return true;
}

export function isEqual(a: LoxValue, b: LoxValue): boolean {
	return (
		a === b ||
		(isCurrency(a) &&
			isCurrency(b) &&
			a.value === b.value &&
			a.currency === b.currency)
	);
}

export function stringify(val: LoxValue): string {
	if (val === null) {
		return "nil";
	}
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (val === undefined) {
		throw new Error(`undefined is not a valid Lox value`);
	}
	if (isCurrency(val)) {
		// XXX this probably wouldn't work in Europe.
		return `${val.currency}${val.value.toLocaleString()}`;
	}
	return String(val);
}
