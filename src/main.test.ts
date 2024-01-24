import * as fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { main, maybeParseAsExpression, resetErrors } from "./main.js";
import { mockError, mockExit, mockLog } from "./test-utils.js";

vi.mock("node:fs/promises");
const mockFs = vi.mocked(fs);

describe("main", () => {
	let stashedArgv = process.argv;
	let exit: ReturnType<typeof mockExit>;
	let error: ReturnType<typeof mockError>;
	let log: ReturnType<typeof mockLog>;
	beforeEach(() => {
		stashedArgv = process.argv;
		exit = mockExit();
		error = mockError();
		log = mockLog();
		resetErrors();
	});
	afterEach(() => {
		process.argv = stashedArgv;
		vi.resetAllMocks();
	});

	it("should execute a file", async () => {
		process.argv = ["node", "gravlax.ts", "expression.lox"];
		mockFs.readFile.mockResolvedValueOnce("print 1 + 2 * 2;");
		await main();
		expect(exit).not.toHaveBeenCalled();
		expect(log).toHaveBeenCalledWith("5");
	});

	it("should bail with too many arguments", async () => {
		process.argv = ["node", "gravlax.ts", "file1.lox", "file2.lox"];
		await main();
		expect(exit).toHaveBeenCalledOnce();
		expect(exit).toHaveBeenCalledWith(64);
		expect(error).toHaveBeenCalledWith("Usage:", "gravlax.ts", "[script]");
	});

	it("should report a syntax error", async () => {
		process.argv = ["node", "gravlax.ts", "file1.lox"];
		mockFs.readFile.mockResolvedValueOnce("+ - /");
		await main();
		expect(exit).toHaveBeenCalledOnce();
		expect(exit).toHaveBeenCalledWith(65);
		expect(error).toHaveBeenCalledWith(
			"[line 1] Error at '+': Expect expression.",
		);
	});

	it("should report a runtime error", async () => {
		process.argv = ["node", "gravlax.ts", "file1.lox"];
		mockFs.readFile.mockResolvedValueOnce("1 + nil;");
		await main();
		expect(exit).toHaveBeenCalledOnce();
		expect(exit).toHaveBeenCalledWith(70);
		expect(error).toHaveBeenCalledWith(
			"Operands must be two numbers/currencies or two strings.\n[line 1]",
		);
	});

	describe("maybeParseAsExpression", () => {
		it("should parse an expressions", () => {
			const error = mockError();
			expect(maybeParseAsExpression("1 + 2*2")).toMatchInlineSnapshot(`
				{
				  "kind": "binary",
				  "left": {
				    "kind": "literal",
				    "value": 1,
				  },
				  "operator": {
				    "lexeme": "+",
				    "line": 1,
				    "literal": null,
				    "type": "+",
				  },
				  "right": {
				    "kind": "binary",
				    "left": {
				      "kind": "literal",
				      "value": 2,
				    },
				    "operator": {
				      "lexeme": "*",
				      "line": 1,
				      "literal": null,
				      "type": "*",
				    },
				    "right": {
				      "kind": "literal",
				      "value": 2,
				    },
				  },
				}
			`);
			expect(error).not.toHaveBeenCalled();
		});

		it("should return null and not log on a statement", () => {
			const error = mockError();
			expect(maybeParseAsExpression("1 + 2*2;")).toBeNull();
			expect(error).not.toHaveBeenCalled();
		});

		it("should return null and not log on a syntax error", () => {
			const error = mockError();
			expect(maybeParseAsExpression("1 + 2*")).toBeNull();
			expect(error).not.toHaveBeenCalled();
		});
	});
});
