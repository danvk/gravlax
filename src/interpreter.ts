import {
	Binary,
	Expr,
	ExpressionVisitor,
	Grouping,
	Literal,
	Unary,
	visitExpr,
} from "./ast.js";

// XXX using eslint quickfix to implement this interface did not work at all.

export class Interpreter implements ExpressionVisitor<unknown> {
	binary(expr: Binary): unknown {
		const left = this.evaluate(expr.left);
		const right = this.evaluate(expr.right);
		switch (expr.operator.type) {
			case "-":
				return (left as number) - (right as number);
			case "/":
				return (left as number) / (right as number);
			case "*":
				return (left as number) * (right as number);
			case "+":
				// This looks kinda funny!
				if (typeof left === "number" && typeof right === "number") {
					return left + right;
				} else if (typeof left === "string" && typeof right === "string") {
					return left + right;
				}
				break;
			case ">":
				return (left as number) > (right as number);
			case ">=":
				return (left as number) >= (right as number);
			case "<":
				return (left as number) < (right as number);
			case "<=":
				return (left as number) <= (right as number);
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

	grouping(expr: Grouping): unknown {}
	literal(expr: Literal): unknown {
		return expr.value;
	}

	unary(expr: Unary): unknown {
		const right = this.evaluate(expr.right);
		switch (expr.operator.type) {
			case "-":
				return -(right as number);
			case "!":
				return !isTruthy(right);
		}
	}
}

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
