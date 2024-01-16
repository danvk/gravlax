import { describe, expect, it, vi } from "vitest";

import { Expression } from "./ast.js";
import { Interpreter, stringify } from "./interpreter.js";
import { parse } from "./parser.js";
import { Scanner } from "./scanner.js";

function parseText(text: string) {
	return parse(new Scanner(text).scanTokens());
}

function parseExpr(text: string) {
	const stmts = parseText(text + ";");
	if (!stmts || stmts.length == 0) {
		return null;
	}
	const stmt = stmts[0] as Expression;
	expect(stmt.kind).toEqual("expr");
	return stmt.expression;
}

function evaluateExpr(text: string) {
	const expr = parseExpr(text);
	return expr && new Interpreter().evaluate(expr);
}

function runProgram(text: string) {
	const stmts = parse(new Scanner(text).scanTokens());
	expect(stmts).not.toBeNull();
	if (!stmts) {
		return;
	}
	new Interpreter().interpret(stmts);
}

describe("interpreter", () => {
	describe("evaluate", () => {
		it("should evaluate an arithmetic expression", () => {
			expect(evaluateExpr("1 + 2 * 3")).toEqual(7);
			expect(evaluateExpr("3 - 1 / 2")).toEqual(2.5);
		});

		it("should evaluate comparison operators", () => {
			expect(evaluateExpr("12 > 6")).toBe(true);
			expect(evaluateExpr("12 > 12")).toBe(false);
			expect(evaluateExpr("12 == 12")).toBe(true);
			expect(evaluateExpr("12 != 12")).toBe(false);
			expect(evaluateExpr("0 == nil")).toBe(false);
			expect(evaluateExpr("nil == nil")).toBe(true);
			expect(evaluateExpr("2 >= 2")).toBe(true);
			expect(evaluateExpr("2 >= 3")).toBe(false);
			expect(evaluateExpr("2 <= 3")).toBe(true);
			expect(evaluateExpr("2 < 3")).toBe(true);
		});

		it("should evaluate unary operators", () => {
			expect(evaluateExpr("-12")).toBe(-12);
			expect(evaluateExpr("-(1 + 2)")).toBe(-3);
			expect(evaluateExpr("!nil")).toBe(true);
			expect(evaluateExpr("!!nil")).toBe(false);
		});

		it("should concatenate strings", () => {
			expect(evaluateExpr(`"hello" + " " + "world"`)).toEqual("hello world");
		});

		it("should evaluate truthiness", () => {
			expect(evaluateExpr("!true")).toEqual(false);
			expect(evaluateExpr("!12")).toEqual(false);
			expect(evaluateExpr("!!nil")).toEqual(false);
			expect(evaluateExpr("!!0")).toEqual(true);
			expect(evaluateExpr(`!!""`)).toEqual(true);
		});

		it("should report an error on mixed + operands", () => {
			expect(() => evaluateExpr(`"12" + 13`)).toThrowError(
				"Operands must be two numbers or two strings.",
			);
		});

		it("should report an error on non-numeric operands", () => {
			expect(() => evaluateExpr(`"12" / 13`)).toThrowError(
				"Operand must be a number.",
			);
		});
	});

	describe("execution", () => {
		it("should interpret and stringify output", () => {
			const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
			runProgram("print 1 + 2;");
			expect(log).toHaveBeenCalledWith("3");
		});

		it("should interpret and report an error", () => {
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => undefined);
			runProgram("1 - nil;");
			expect(error).toHaveBeenCalledWith("Operand must be a number.\n[line 1]");
		});
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
