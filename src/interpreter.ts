import {
	Assign,
	Binary,
	Block,
	Expr,
	Expression,
	ExpressionVisitor,
	Grouping,
	IfStmt,
	Literal,
	Print,
	Stmt,
	StmtVisitor,
	Unary,
	VarExpr,
	VarStmt,
	visitExpr,
	visitStmt,
} from "./ast.js";
import { Environment } from "./environment.js";
import { runtimeError } from "./main.js";
import { Token } from "./token.js";

// XXX using eslint quickfix to implement this interface did not work at all.

// TODO: introduce a type for Lox values, rather than using unknown.

// TODO: try making this an object instead of a class so that the parameter
// types are inferred.
export class Interpreter
	implements ExpressionVisitor<unknown>, StmtVisitor<void>
{
	#environment = new Environment();

	"var-expr"(expr: VarExpr): unknown {
		return this.#environment.get(expr.name);
	}

	"var-stmt"(stmt: VarStmt): unknown {
		let value = null;
		if (stmt.initializer) {
			value = this.evaluate(stmt.initializer);
		}
		this.#environment.define(stmt.name.lexeme, value);
		return null;
	}

	assign(expr: Assign): unknown {
		const value = this.evaluate(expr.value);
		this.#environment.assign(expr.name, value);
		return value;
	}

	binary(expr: Binary): unknown {
		const left = this.evaluate(expr.left);
		const right = this.evaluate(expr.right);
		const { operator } = expr;
		switch (operator.type) {
			case "-":
				checkNumberOperand(operator, left);
				checkNumberOperand(operator, right);
				return left - right;
			case "/":
				checkNumberOperand(operator, left);
				checkNumberOperand(operator, right);
				return left / right;
			case "*":
				checkNumberOperand(operator, left);
				checkNumberOperand(operator, right);
				return left * right;
			case "+":
				// This looks kinda funny!
				if (typeof left === "number" && typeof right === "number") {
					return left + right;
				} else if (typeof left === "string" && typeof right === "string") {
					return left + right;
				}
				throw new RuntimeError(
					operator,
					"Operands must be two numbers or two strings.",
				);

			case ">":
				checkNumberOperand(operator, left);
				checkNumberOperand(operator, right);
				return left > right;
			case ">=":
				checkNumberOperand(operator, left);
				checkNumberOperand(operator, right);
				return left >= right;
			case "<":
				checkNumberOperand(operator, left);
				checkNumberOperand(operator, right);
				return left < right;
			case "<=":
				checkNumberOperand(operator, left);
				checkNumberOperand(operator, right);
				return left <= right;
			case "==":
				return isEqual(left, right);
			case "!=":
				return !isEqual(left, right);
		}

		return null;
	}

	block(block: Block): void {
		this.executeBlock(block.statements, new Environment(this.#environment));
	}

	evaluate(expr: Expr): unknown {
		return visitExpr(expr, this);
	}

	execute(stmt: Stmt): void {
		visitStmt(stmt, this);
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

	expr(stmt: Expression): void {
		this.evaluate(stmt.expression);
	}

	grouping(expr: Grouping): unknown {
		return this.evaluate(expr.expr);
	}

	if(stmt: IfStmt): void {
		if (isTruthy(this.evaluate(stmt.condition))) {
			this.execute(stmt.thenBranch);
		} else if (stmt.elseBranch !== null) {
			this.execute(stmt.elseBranch);
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

	literal(expr: Literal): unknown {
		return expr.value;
	}

	print(stmt: Print): void {
		const value = this.evaluate(stmt.expression);
		console.log(stringify(value));
	}

	unary(expr: Unary): unknown {
		const right = this.evaluate(expr.right);
		switch (expr.operator.type) {
			case "-":
				checkNumberOperand(expr.operator, right);
				return -right;
			case "!":
				return !isTruthy(right);
		}
	}
}

export class RuntimeError extends Error {
	token: Token;
	constructor(token: Token, message: string) {
		super(message);
		this.token = token;
	}
}

function checkNumberOperand(
	operator: Token,
	operand: unknown,
): asserts operand is number {
	if (typeof operand === "number") {
		return;
	}
	throw new RuntimeError(operator, "Operand must be a number.");
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

export function isTruthy(val: unknown): boolean {
	if (val === null) {
		return false;
	}
	if (typeof val === "boolean") {
		return val;
	}
	return true;
}

export function isEqual(a: unknown, b: unknown): boolean {
	return a === b;
}

export function stringify(val: unknown): string {
	if (val === null) {
		return "nil";
	}
	return String(val);
}
