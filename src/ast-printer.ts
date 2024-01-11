import { Expr, ExpressionVisitor, visitExpr } from "./ast.js";

export const astPrinter: ExpressionVisitor<string> = {
	binary: (expr) => parenthesize(expr.operator.lexeme, expr.left, expr.right),
	grouping: (expr) => parenthesize("group", expr.expr),
	literal: (expr) => (expr.value === null ? "nil" : String(expr.value)),
	unary: (expr) => parenthesize(expr.operator.lexeme, expr.right),
};

function parenthesize(name: string, ...exprs: Expr[]) {
	const parts = ["(", name];
	for (const expr of exprs) {
		parts.push(" ");
		parts.push(visitExpr(expr, astPrinter));
	}
	parts.push(")");
	return parts.join("");
}
