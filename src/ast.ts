import { Token } from "./token.js";

export interface Binary {
	kind: "binary";
	left: Expr;
	operator: Token;
	right: Expr;
}

export interface Grouping {
	expr: Expr;
	kind: "grouping";
}

export interface Literal {
	kind: "literal";
	value: boolean | null | number | string;
}

export interface Unary {
	kind: "unary";
	operator: Token;
	right: Expr;
}

export interface VarExpr {
	kind: "var-expr";
	name: Token;
}

// Expression Statement
export interface Expression {
	expression: Expr;
	kind: "expr";
}

export interface Print {
	expression: Expr;
	kind: "print";
}

export interface VarStmt {
	initializer: Expr | null;
	kind: "var-stmt";
	name: Token;
}

export type Expr = Binary | Grouping | Literal | Unary | VarExpr;
export type Stmt = Expression | Print | VarStmt;

export type ExpressionVisitor<R> = {
	[Kind in Expr["kind"]]: (expr: Extract<Expr, { kind: Kind }>) => R;
};
export type StmtVisitor<R> = {
	[Kind in Stmt["kind"]]: (stmt: Extract<Stmt, { kind: Kind }>) => R;
};

export function visitExpr<R>(expr: Expr, visitor: ExpressionVisitor<R>): R {
	// XXX Can you model this without the "as never" in TS?
	return visitor[expr.kind](expr as never);
}

export function visitStmt<R>(stmt: Stmt, visitor: StmtVisitor<R>): R {
	return visitor[stmt.kind](stmt as never);
}
