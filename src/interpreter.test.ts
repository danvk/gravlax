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
});
