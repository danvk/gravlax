// End-to-end tests of the gravlax interpreter.
import * as fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { main, resetErrors } from "./main.js";
import { mockError, mockExit } from "./test-utils.js";

const testFiles = [
	"end-of-chapter8.lox",
	"chapter8-challenge3.lox",
	"chapter8-assign-outer-scope.lox",
	"chapter9-fibonacci.lox",
	"chapter9-for.lox",
	"chapter9-if-statement.lox",
	"chapter9-logical.lox",
	"chapter9-while.lox",
	"chapter10-add-abc.lox",
	"chapter10-define-and-call-fun.lox",
	"chapter10-fibonacci.lox",
	"chapter10-make-counter.lox",
	"chapter10-multi-currency.lox",
	"chapter10-return-in-loop.lox",
	"chapter10-return-nothing.lox",
];

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

	it.each(testFiles.map((file) => [file]))("baseline: %s", async (filename) => {
		const baseline = filename.replace(".lox", ".txt");
		const expected = await fs.readFile(`baselines/${baseline}`, "utf8");
		process.argv = ["node", "gravlax.ts", `examples/${filename}`];
		await main();
		expect(exit).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		expect(logLines).toEqual(expected.trimEnd().split("\n"));
	});
});
