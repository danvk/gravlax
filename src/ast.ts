import { Token } from "./token.js";

export interface Binary {
	kind: "binary";
	left: Expr;
	operator: Token;
	right: Expr;
}

export interface Grouping {
	kind: "grouping";
	expr: Expr;
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

export interface Logical {
	kind: "logical";
	left: Expr;
	operator: Token;
	right: Expr;
}

export interface VarExpr {
	kind: "var-expr";
	name: Token;
}

export interface Call {
	kind: "call";
	callee: Expr;
	paren: Token;
	args: Expr[];
}

// Statements

export interface Assign {
	kind: "assign";
	name: Token;
	value: Expr;
}

// Expression Statement
export interface Expression {
	kind: "expr";
	expression: Expr;
}

export interface Print {
	kind: "print";
	expression: Expr;
}

export interface VarStmt {
	kind: "var-stmt";
	initializer: Expr | null;
	name: Token;
}

export interface IfStmt {
	kind: "if";
	condition: Expr;
	thenBranch: Stmt;
	elseBranch: Stmt | null;
}

export interface Block {
	kind: "block";
	statements: Stmt[];
}

export interface While {
	kind: "while";
	condition: Expr;
	body: Stmt;
}

export interface Func {
	kind: "func";
	name: Token;
	params: Token[];
	body: Stmt[];
}

export type Expr =
	| Assign
	| Binary
	| Call
	| Grouping
	| Literal
	| Logical
	| Unary
	| VarExpr;
export type Stmt = Block | Expression | Func | IfStmt | Print | VarStmt | While;

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
