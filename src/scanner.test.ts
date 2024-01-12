import { describe, expect, it, vi } from "vitest";

import { Scanner } from "./scanner.js";
import { tokenToString } from "./token.js";

function scan(source: string) {
	return new Scanner(source).scanTokens().map(tokenToString);
}

describe("Scanner", () => {
	it("should scan an arithmetic expression", () => {
		expect(scan("1 + 2 * 3 + 4 / 8")).toMatchInlineSnapshot(`
			[
			  "'1': number: 1",
			  "'+': +",
			  "'2': number: 2",
			  "'*': *",
			  "'3': number: 3",
			  "'+': +",
			  "'4': number: 4",
			  "'/': /",
			  "'8': number: 8",
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

	it("should scan operators", () => {
		expect(scan("!(12 <= 34) != true")).toMatchInlineSnapshot(`
			[
			  "'!': !",
			  "'(': (",
			  "'12': number: 12",
			  "'<=': <=",
			  "'34': number: 34",
			  "')': )",
			  "'!=': !=",
			  "'true': true: true",
			  "'': eof",
			]
		`);
	});

	it("should scan a full program", () => {
		expect(
			scan(`
      // This function prints Hello World!
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

	it("should report an unterminated string", () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		expect(scan(`"this is an unterminated string`)).toMatchInlineSnapshot(`
			[
			  "'': eof",
			]
		`);
		expect(error).toHaveBeenCalledWith("[line 1] Error: Unterminated string.");
	});

	it("should report invalid characters", () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		expect(scan("@")).toMatchInlineSnapshot(`
			[
			  "'': eof",
			]
		`);
		expect(error).toHaveBeenCalledWith(
			`[line 1] Error: Unexpected character "@"`,
		);
	});

	it("should scan a string with an embedded newline", () => {
		expect(
			scan(`
    "hello
    world"`),
		).toMatchInlineSnapshot(`
			[
			  "'"hello
			    world"': string: hello
			    world",
			  "'': eof",
			]
		`);
	});

	it("should scan source with surprising terminal characters", () => {
		expect(scan(`123.`)).toMatchInlineSnapshot(`
			[
			  "'123': number: 123",
			  "'.': .",
			  "'': eof",
			]
		`);
		expect(scan(`12>`)).toMatchInlineSnapshot(`
			[
			  "'12': number: 12",
			  "'>': >",
			  "'': eof",
			]
		`);
	});

	it("should scan a number with commas", () => {
		expect(scan(`123,456.789`)).toMatchInlineSnapshot(`
			[
			  "'123,456.789': number: 123456.789",
			  "'': eof",
			]
		`);
	});

	it("should scan a number with commas starting with a dollar sign", () => {
		expect(scan(`$123,456.79`)).toMatchInlineSnapshot(`
			[
			  "'$123,456.79': number: $123456.79",
			  "'': eof",
			]
		`);
	});
});
