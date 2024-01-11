import { expect, test } from "vitest";

import { Expr, visitExpr } from "./ast.js";
import { astPrinter } from "./ast-printer.js";

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
	const text = visitExpr(expr, astPrinter);
	expect(text).toEqual("(* (- 123) (group 45.67))");
});
