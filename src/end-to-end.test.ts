// End-to-end tests of the gravlax interpreter.
import {
	MockInstance,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import { main, resetErrors } from "./main.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockType<Fn extends (...args: any[]) => any> = MockInstance<
	Parameters<Fn>,
	ReturnType<Fn>
>;

// Similar to tests in main.test.ts, except that fs isn't mocked.
describe("end-to-end tests", () => {
	let stashedArgv = process.argv;
	let exit: MockType<typeof process.exit>;
	let error: MockType<(typeof console)["error"]>;
	// let log: MockType<(typeof console)["log"]>;
	let logLines: string[] = [];
	beforeEach(() => {
		stashedArgv = process.argv;
		exit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never);
		error = vi.spyOn(console, "error").mockImplementation(() => undefined);
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
});
