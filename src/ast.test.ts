import { expect, test } from "vitest";

import { Expr, ExpressionVisitor, visitExpr } from "./ast.js";

const printer: ExpressionVisitor<string> = {
	binary: (expr) => parenthesize(expr.operator.lexeme, expr.left, expr.right),
	grouping: (expr) => parenthesize("group", expr.expr),
	literal: (expr) => (expr.value === null ? "nil" : String(expr.value)),
	unary: (expr) => parenthesize(expr.operator.lexeme, expr.right),
};

function parenthesize(name: string, ...exprs: Expr[]) {
	const parts = ["(", name];
	for (const expr of exprs) {
		parts.push(" ");
		parts.push(visitExpr(expr, printer));
	}
	parts.push(")");
	return parts.join("");
}

test("AST Visitor", () => {
	const expr: Expr = {
		kind: "binary",
		left: {
			kind: "unary",
			operator: { lexeme: "-", line: 1, literal: null, type: "-" },
			right: { kind: "literal", value: 123 },
		},
		operator: { lexeme: "*", line: 1, literal: null, type: "*" },
		right: {
			expr: {
				kind: "literal",
				value: 45.67,
			},
			kind: "grouping",
		},
	};
	const text = visitExpr(expr, printer);
	expect(text).toEqual("(* (- 123) (group 45.67))");
});
