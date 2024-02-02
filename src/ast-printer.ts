import {
	Expr,
	ExpressionVisitor,
	StmtVisitor,
	visitExpr,
	visitStmt,
} from "./ast.js";
import { stringify } from "./interpreter.js";

export const astPrinter: ExpressionVisitor<string> & StmtVisitor<string> = {
	assign: (stmt) => parenthesize("assign", stmt.name.lexeme, stmt.value),
	binary: (expr) => parenthesize(expr.operator.lexeme, expr.left, expr.right),
	block: (block) =>
		parenthesizeText(
			"block",
			...block.statements.map((stmt) => visitStmt(stmt, astPrinter)),
		),
	call: (expr) => parenthesize(expr.callee, ...expr.args),
	class: (stmt) => parenthesizeText("class", stmt.name.lexeme, "..."),
	expr: (stmt) => visitExpr(stmt.expression, astPrinter),
	func: (stmt) =>
		parenthesizeText(
			"func",
			parenthesizeText(stmt.name.lexeme, ...stmt.params.map((p) => p.lexeme)),
			visitStmt({ kind: "block", statements: stmt.body }, astPrinter),
		),
	get: (expr) => parenthesize("get", expr.object, expr.name.lexeme),
	grouping: (expr) => parenthesize("group", expr.expr),
	if: (stmt) =>
		parenthesizeText(
			"if",
			visitExpr(stmt.condition, astPrinter),
			visitStmt(stmt.thenBranch, astPrinter),
			stmt.elseBranch && visitStmt(stmt.elseBranch, astPrinter),
		),
	literal: (expr) => stringify(expr.value),
	logical: (expr) => parenthesize(expr.operator.lexeme, expr.left, expr.right),
	print: (stmt) => parenthesize("print", stmt.expression),
	return: (stmt) => parenthesize("return", ...(stmt.value ? [stmt.value] : [])),
	set: (expr) => parenthesize("set", expr.object, expr.name.lexeme, expr.value),
	super: () => "super",
	this: () => parenthesize("this"),
	unary: (expr) => parenthesize(expr.operator.lexeme, expr.right),
	"var-expr": (expr) => String(expr.name.literal),
	"var-stmt": (stmt) =>
		parenthesizeText(
			"var",
			String(stmt.name.literal),
			...(stmt.initializer ? [visitExpr(stmt.initializer, astPrinter)] : []),
		),

	while: (stmt) =>
		parenthesizeText(
			"while",
			visitExpr(stmt.condition, astPrinter),
			visitStmt(stmt.body, astPrinter),
		),
};

function parenthesizeText(...parts: (null | string)[]) {
	return "(" + parts.filter((part) => part !== null).join(" ") + ")";
}

// This would be nicer if it could be (Expr | Stmt)… but there's no programmatic
// way to distinguish those two in order to tell which visit function to call.
function parenthesize(...exprs: (Expr | string)[]) {
	const parts = [];
	for (const expr of exprs) {
		parts.push(typeof expr == "string" ? expr : visitExpr(expr, astPrinter));
	}
	return parenthesizeText(...parts);
}
