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
	value: null | number | string;
}

export interface Unary {
	kind: "unary";
	operator: Token;
	right: Expr;
}

export type Expr = Binary | Grouping | Literal | Unary;

export type ExpressionVisitor<R> = {
	[Kind in Expr["kind"]]: (expr: Extract<Expr, { kind: Kind }>) => R;
};

export function visitExpr<R>(expr: Expr, visitor: ExpressionVisitor<R>): R {
	return visitor[expr.kind](expr as never);
}
