import { describe, expect, it } from "vitest";

import { Scanner } from "./scanner.js";
import { tokenToString } from "./token.js";

function scan(source: string) {
	return new Scanner(source).scanTokens().map(tokenToString);
}

describe("Scanner", () => {
	it("should scan an arithmetic expression", () => {
		expect(scan("1 + 2 * 3 + 4")).toMatchInlineSnapshot(`
			[
			  "'1': number: 1",
			  "'+': +",
			  "'2': number: 2",
			  "'*': *",
			  "'3': number: 3",
			  "'+': +",
			  "'4': number: 4",
			  "'': eof",
			]
		`);
	});

	it("should parse decimals", () => {
		expect(scan("-123.456 + 0.456 + 10.abs()")).toMatchInlineSnapshot(`
			[
			  "'-': -",
			  "'123.456': number: 123.456",
			  "'+': +",
			  "'0.456': number: 0.456",
			  "'+': +",
			  "'10': number: 10",
			  "'.': .",
			  "'abs': identifier: abs",
			  "'(': (",
			  "')': )",
			  "'': eof",
			]
		`);
	});

	it("should scan a full program", () => {
		expect(
			scan(`
      fun hello() {
        print "Hello World!";
      }

      hello();
    `),
		).toMatchInlineSnapshot(`
			[
			  "'fun': fun: fun",
			  "'hello': identifier: hello",
			  "'(': (",
			  "')': )",
			  "'{': {",
			  "'print': print: print",
			  "'"Hello World!"': string: Hello World!",
			  "';': ;",
			  "'}': }",
			  "'hello': identifier: hello",
			  "'(': (",
			  "')': )",
			  "';': ;",
			  "'': eof",
			]
		`);
	});
});
