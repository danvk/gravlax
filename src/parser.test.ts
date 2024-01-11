import { describe, expect, it } from "vitest";

import { visitExpr } from "./ast.js";
import { astPrinter } from "./ast-printer.js";
import { parse } from "./parser.js";
import { Scanner } from "./scanner.js";

function parseToLisp(text: string) {
	const expr = parse(new Scanner(text).scanTokens());
	expect(expr).toBeTruthy();
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return visitExpr(expr!, astPrinter);
}

describe("parse", () => {
	it("should parse a literal", () => {
		expect(parseToLisp("123")).toMatchInlineSnapshot(`"123"`);
	});

	it("should parse an arithmetic expression", () => {
		expect(parseToLisp("1 + 2 * 2")).toMatchInlineSnapshot(`"(+ 1 (* 2 2))"`);
	});

	it("should parse repeated negations", () => {
		expect(parseToLisp("!!!false")).toMatchInlineSnapshot(
			`"(! (! (! false)))"`,
		);
	});

	it("should parse other types of literals", () => {
		expect(
			parseToLisp('true / false + nil - "str" + -123.456'),
		).toMatchInlineSnapshot(`"(+ (- (+ (/ true false) nil) str) (- 123.456))"`);
	});

	it("should parse comparison operators", () => {
		expect(parseToLisp("1 + 2 >= 3")).toMatchInlineSnapshot(`"(>= (+ 1 2) 3)"`);
		expect(parseToLisp("1 + 2.5 < 4")).toMatchInlineSnapshot(
			`"(< (+ 1 2.5) 4)"`,
		);
	});

	it("should parse equality operators", () => {
		expect(parseToLisp("1 + 2 == 3")).toMatchInlineSnapshot(`"(== (+ 1 2) 3)"`);
		expect(parseToLisp("1 + 3 != 2 * 2")).toMatchInlineSnapshot(
			`"(!= (+ 1 3) (* 2 2))"`,
		);
	});
});
