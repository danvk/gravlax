// End-to-end tests of the gravlax interpreter.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { main, resetErrors } from "./main.js";
import { mockError, mockExit } from "./test-utils.js";

// Similar to tests in main.test.ts, except that fs isn't mocked.
describe("end-to-end tests", () => {
	let stashedArgv = process.argv;
	let exit: ReturnType<typeof mockExit>;
	let error: ReturnType<typeof mockError>;
	let logLines: string[] = [];
	beforeEach(() => {
		stashedArgv = process.argv;
		exit = mockExit();
		error = mockError();
		vi.spyOn(console, "log").mockImplementation((line: string) => {
			logLines.push(line);
		});
		logLines = [];
		resetErrors();
	});
	afterEach(() => {
		process.argv = stashedArgv;
		vi.resetAllMocks();
	});

	it("should execute a program with nested scopes", async () => {
		process.argv = ["node", "gravlax.ts", "examples/end-of-chapter8.lox"];
		await main();
		expect(exit).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		expect(logLines).toMatchInlineSnapshot(`
			[
			  "inner a",
			  "outer b",
			  "global c",
			  "outer a",
			  "outer b",
			  "global c",
			  "global a",
			  "global b",
			  "global c",
			]
		`);
	});

	it("should access outer scope in initializer", async () => {
		process.argv = ["node", "gravlax.ts", "examples/chapter8-challenge3.lox"];
		await main();
		expect(exit).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		expect(logLines).toMatchInlineSnapshot(`
			[
			  "3",
			]
		`);
	});

	it("should assign to outer scope variables and unshadow", async () => {
		process.argv = [
			"node",
			"gravlax.ts",
			"examples/chapter8-assign-outer-scope.lox",
		];
		await main();
		expect(exit).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		expect(logLines).toMatchInlineSnapshot(`
			[
			  "outer",
			  "inner",
			  "new outer",
			]
		`);
	});
});
