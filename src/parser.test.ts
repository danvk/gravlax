import { describe, expect, it, vi } from "vitest";

import { visitStmt } from "./ast.js";
import { astPrinter } from "./ast-printer.js";
import { parse } from "./parser.js";
import { Scanner } from "./scanner.js";

function parseExprToLisp(text: string) {
	const stmts = parse(new Scanner(text).scanTokens());
	if (stmts === null || stmts.length == 0) {
		return null;
	}
	return visitStmt(stmts[0], astPrinter);
}

function parseProgram(text: string) {
	const stmts = parse(new Scanner(text).scanTokens());
	if (!stmts) {
		return null;
	}
	return stmts.map((stmt) => visitStmt(stmt, astPrinter));
}

describe("parsing expressions", () => {
	it("should parse a literal", () => {
		expect(parseExprToLisp("123;")).toMatchInlineSnapshot(`"123"`);
	});

	it("should parse an arithmetic expression", () => {
		expect(parseExprToLisp("1 + 2 * 2;")).toMatchInlineSnapshot(
			`"(+ 1 (* 2 2))"`,
		);
	});

	it("should parse repeated negations", () => {
		expect(parseExprToLisp("!!!false;")).toMatchInlineSnapshot(
			`"(! (! (! false)))"`,
		);
	});

	it("should parse other types of literals", () => {
		expect(
			parseExprToLisp('true / false + nil - "str" + -123.456;'),
		).toMatchInlineSnapshot(`"(+ (- (+ (/ true false) nil) str) (- 123.456))"`);
	});

	it("should parse comparison operators", () => {
		expect(parseExprToLisp("1 + 2 >= 3;")).toMatchInlineSnapshot(
			`"(>= (+ 1 2) 3)"`,
		);
		expect(parseExprToLisp("1 + 2.5 < 4;")).toMatchInlineSnapshot(
			`"(< (+ 1 2.5) 4)"`,
		);
	});

	it("should parse equality operators", () => {
		expect(parseExprToLisp("1 + 2 == 3;")).toMatchInlineSnapshot(
			`"(== (+ 1 2) 3)"`,
		);
		expect(parseExprToLisp("1 + 3 != 2 * 2;")).toMatchInlineSnapshot(
			`"(!= (+ 1 3) (* 2 2))"`,
		);
	});

	it("should parse expressions with currency", () => {
		expect(parseExprToLisp("$1,123.45 + 2 * $37.48;")).toMatchInlineSnapshot(
			`"(+ 1123.45 (* 2 37.48))"`,
		);
	});

	it("should parse block expressions and variables", () => {
		expect(
			parseProgram(`
			var x = 12;
			{
				var y = 23;
				x = 34;
				print x + y;
			}
		`),
		).toMatchInlineSnapshot(`
			[
			  "(var x 12)",
			  "(block (var y 23) (assign x 34) (print (+ x y)))",
			]
		`);
	});

	it("should error on unbalanced parens", () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		expect(parseExprToLisp("(1 + 1);")).toMatchInlineSnapshot(
			`"(group (+ 1 1))"`,
		);
		expect(error).not.toHaveBeenCalled();

		expect(parseExprToLisp("(1 + 1;")).toMatchInlineSnapshot("null");
		expect(error).toHaveBeenCalledWith(
			"[line 1] Error at ';': Expect ')' after expression.",
		);
	});

	it("should resynchronize after a parse error", () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		expect(
			parseProgram(`
			var x = + -;
			print "hello";
		`),
		).toMatchInlineSnapshot(`
			[
			  "(print hello)",
			]
		`);
		expect(error).toHaveBeenCalledWith(
			"[line 2] Error at '+': Expect expression.",
		);
	});

	it("should resynchronize without a semicolon", () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		// It would be nice if we didn't lose the `print "hello"`.
		expect(
			parseProgram(`
			var x = 12
			print "hello";
			print "goodbye";
			`),
		).toMatchInlineSnapshot(`
			[
			  "(print goodbye)",
			]
		`);

		expect(error).toHaveBeenCalledWith(
			"Error at 'print': Expect ';' after variable declaration.",
		);
	});
});
