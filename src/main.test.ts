import {
	MockInstance,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import { add, main } from "./main.js";

describe("add", () => {
	it("adds two numbers", () => {
		expect(add(1, 2)).toEqual(3);
	});

	it("adds negative numbers", () => {
		expect(add(13, -13)).toEqual(0);
	});

	it("adds floating point numbers", () => {
		expect(add(0.25, 0.5)).toEqual(0.75);
	});
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockType<Fn extends (...args: any[]) => any> = MockInstance<
	Parameters<Fn>,
	ReturnType<Fn>
>;

describe("main", () => {
	let stashedArgv = process.argv;
	let exit: MockType<typeof process.exit>;
	let error: MockType<(typeof console)["error"]>;
	let log: MockType<(typeof console)["log"]>;
	beforeEach(() => {
		stashedArgv = process.argv;
		exit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never);
		error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		log = vi.spyOn(console, "log").mockImplementation(() => undefined);
	});
	afterEach(() => {
		process.argv = stashedArgv;
		vi.restoreAllMocks();
	});

	it("should execute a file", async () => {
		process.argv = ["node", "gravlax.ts", "examples/expression.lox"];
		await main();
		expect(exit).not.toHaveBeenCalled();
		expect(log).toHaveBeenCalledWith("5");
	});

	it("should bail with too many arguments", async () => {
		process.argv = ["node", "gravlax.ts", "file1.lox", "file2.lox"];
		await main();
		expect(exit).toHaveBeenCalledWith(64);
		expect(error).toHaveBeenCalledWith("Usage:", "gravlax.ts", "[script]");
	});
});
