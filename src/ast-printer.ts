import { Expr, ExpressionVisitor, StmtVisitor, visitExpr } from "./ast.js";

export const astPrinter: ExpressionVisitor<string> & StmtVisitor<string> = {
	binary: (expr) => parenthesize(expr.operator.lexeme, expr.left, expr.right),
	expr: (stmt) => visitExpr(stmt.expression, astPrinter),
	grouping: (expr) => parenthesize("group", expr.expr),
	literal: (expr) => (expr.value === null ? "nil" : String(expr.value)),
	print: (stmt) => parenthesize("print", stmt.expression),
	unary: (expr) => parenthesize(expr.operator.lexeme, expr.right),
	"var-expr": (expr) => String(expr.name.literal),
	"var-stmt": (stmt) =>
		parenthesizeText(
			"var",
			String(stmt.name.literal),
			...(stmt.initializer ? [visitExpr(stmt.initializer, astPrinter)] : []),
		),
};

function parenthesizeText(...parts: string[]) {
	return "(" + parts.join(" ") + ")";
}

function parenthesize(name: string, ...exprs: Expr[]) {
	const parts = [name];
	for (const expr of exprs) {
		parts.push(visitExpr(expr, astPrinter));
	}
	return parenthesizeText(...parts);
}
