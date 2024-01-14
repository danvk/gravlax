import { describe, expect, it, vi } from "vitest";

import { Interpreter, stringify } from "./interpreter.js";
import { parse } from "./parser.js";
import { Scanner } from "./scanner.js";

function parseText(text: string) {
	return parse(new Scanner(text).scanTokens());
}

function evaluate(text: string) {
	const expr = parseText(text);
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

	it("should evaluate truthiness", () => {
		expect(evaluate("!true")).toEqual(false);
		expect(evaluate("!12")).toEqual(false);
		expect(evaluate("!!nil")).toEqual(false);
		expect(evaluate("!!0")).toEqual(true);
		expect(evaluate(`!!""`)).toEqual(true);
	});

	it("should report an error on mixed + operands", () => {
		expect(() => evaluate(`"12" + 13`)).toThrowError(
			"Operands must be two numbers or two strings.",
		);
	});

	it("should report an error on non-numeric operands", () => {
		expect(() => evaluate(`"12" / 13`)).toThrowError(
			"Operand must be a number.",
		);
	});

	it("should interpret and stringify output", () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		const expr = parseText("1 + 2");
		expect(expr).not.toBeNull();
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		new Interpreter().interpret(expr!);
		expect(log).toHaveBeenCalledWith("3");
	});

	it("should interpret and report an error", () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const expr = parseText("1 - nil");
		expect(expr).not.toBeNull();
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		new Interpreter().interpret(expr!);
		expect(error).toHaveBeenCalledWith("Operand must be a number.\n[line 1]");
	});
});

describe("stringify", () => {
	it("should stringify a null value", () => {
		expect(stringify(null)).toEqual("nil");
	});

	it("should stringify a numbers", () => {
		expect(stringify(123)).toEqual("123");
		expect(stringify(-123)).toEqual("-123");
		expect(stringify(1.25)).toEqual("1.25");
		expect(stringify(-0.125)).toEqual("-0.125");
	});

	it("should stringify booleans", () => {
		expect(stringify(true)).toEqual("true");
		expect(stringify(false)).toEqual("false");
	});

	it("should stringify strings", () => {
		expect(stringify("")).toEqual(``);
		expect(stringify("hello")).toEqual(`hello`);
	});
});
