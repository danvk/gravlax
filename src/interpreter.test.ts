import { describe, expect, it } from "vitest";

import { Interpreter } from "./interpreter.js";
import { parse } from "./parser.js";
import { Scanner } from "./scanner.js";

function evaluate(text: string) {
	const expr = parse(new Scanner(text).scanTokens());
	return expr && new Interpreter().evaluate(expr);
}

describe("interpreter", () => {
	it("should evaluate an arithmetic expression", () => {
		expect(evaluate("1 + 2 * 3")).toEqual(7);
		expect(evaluate("3 - 1 / 2")).toEqual(2.5);
	});

	it("should evaluate comparison operators", () => {
		expect(evaluate("12 > 6")).toBe(true);
		expect(evaluate("12 > 12")).toBe(false);
		expect(evaluate("12 == 12")).toBe(true);
		expect(evaluate("12 != 12")).toBe(false);
		expect(evaluate("0 == nil")).toBe(false);
		expect(evaluate("nil == nil")).toBe(true);
		expect(evaluate("2 >= 2")).toBe(true);
		expect(evaluate("2 >= 3")).toBe(false);
		expect(evaluate("2 <= 3")).toBe(true);
		expect(evaluate("2 < 3")).toBe(true);
	});

	it("should evaluate unary operators", () => {
		expect(evaluate("-12")).toBe(-12);
		expect(evaluate("-(1 + 2)")).toBe(-3);
		expect(evaluate("!nil")).toBe(true);
		expect(evaluate("!!nil")).toBe(false);
	});

	it("should concatenate strings", () => {
		expect(evaluate(`"hello" + " " + "world"`)).toEqual("hello world");
	});
});
