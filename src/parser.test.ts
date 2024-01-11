import { describe, expect, it, vi } from "vitest";

import { Scanner } from "./scanner.js";
import { parse } from "./parser.js";

function parseText(text: string) {
	return parse(new Scanner(text).scanTokens());
}

describe("parse", () => {
	it("should parse a literal", () => {
		expect(parseText("123")).toMatchInlineSnapshot(`
			{
			  "kind": "literal",
			  "value": 123,
			}
		`);
	});
});
