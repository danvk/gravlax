import {
	Binary,
	Expr,
	Expression,
	ExpressionVisitor,
	Grouping,
	Literal,
	Print,
	Stmt,
	StmtVisitor,
	Unary,
	visitExpr,
	visitStmt,
} from "./ast.js";
import { runtimeError } from "./main.js";
import { Token } from "./token.js";

// XXX using eslint quickfix to implement this interface did not work at all.

export class Interpreter
	implements ExpressionVisitor<unknown>, StmtVisitor<void>
{
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

	evaluate(expr: Expr): unknown {
		return visitExpr(expr, this);
	}

	execute(stmt: Stmt): void {
		visitStmt(stmt, this);
	}

	expr(stmt: Expression): void {
		this.evaluate(stmt.expression);
	}

	grouping(expr: Grouping): unknown {
		return this.evaluate(expr.expr);
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
