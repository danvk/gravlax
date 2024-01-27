import { CurrencyValue } from "./lox-value.js";
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
	value: CurrencyValue | boolean | null | number | string;
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

export interface Get {
	kind: "get";
	object: Expr;
	name: Token;
}

export interface This {
	kind: "this";
	keyword: Token;
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

export interface Return {
	kind: "return";
	keyword: Token;
	value: Expr | null;
}

export interface Class {
	kind: "class";
	name: Token;
	methods: Func[];
}

export interface SetExpr {
	kind: "set";
	object: Expr;
	name: Token;
	value: Expr;
}

export type Expr =
	| Assign
	| Binary
	| Call
	| Get
	| Grouping
	| Literal
	| Logical
	| SetExpr
	| This
	| Unary
	| VarExpr;
export type Stmt =
	| Block
	| Class
	| Expression
	| Func
	| IfStmt
	| Print
	| Return
	| VarStmt
	| While;

export type ExpressionVisitor<R> = {
	[Kind in Expr["kind"]]: (expr: Extract<Expr, { kind: Kind }>) => R;
};
export type StmtVisitor<R> = {
	[Kind in Stmt["kind"]]: (stmt: Extract<Stmt, { kind: Kind }>) => R;
};

export function visitExpr<R>(expr: Expr, visitor: ExpressionVisitor<R>): R {
	// XXX Can you model this without the "as never" in TS?
	// https://stackoverflow.com/q/77876338/388951
	// https://github.com/microsoft/TypeScript/issues/30581
	return visitor[expr.kind](expr as never);
}

export function visitStmt<R>(stmt: Stmt, visitor: StmtVisitor<R>): R {
	return visitor[stmt.kind](stmt as never);
}
