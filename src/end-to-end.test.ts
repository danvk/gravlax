// End-to-end tests of the gravlax interpreter.
import * as fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { main, resetErrors } from "./main.js";
import { mockError, mockExit, mockLog } from "./test-utils.js";

const testFiles = (await fs.readdir("examples", { recursive: true })).filter(
	(path) => path.endsWith(".lox"),
);

async function maybeReadFile(path: string): Promise<null | string> {
	try {
		return await fs.readFile(path, "utf-8");
	} catch (e) {
		if (e instanceof Error && "errno" in e && e.errno === -2) {
			return null;
		}
		throw e;
	}
}

// Similar to tests in main.test.ts, except that fs isn't mocked.
describe("end-to-end tests", () => {
	let stashedArgv = process.argv;
	let exit: ReturnType<typeof mockExit>;
	let log: ReturnType<typeof mockLog>;
	let error: ReturnType<typeof mockError>;
	let logLines: string[] = [];
	let errorLines: string[] = [];
	beforeEach(() => {
		stashedArgv = process.argv;
		exit = mockExit();
		log = vi.spyOn(console, "log").mockImplementation((line: string) => {
			logLines.push(line);
		});
		error = vi.spyOn(console, "error").mockImplementation((line: string) => {
			errorLines.push(line);
		});
		logLines = [];
		errorLines = [];
		resetErrors();
	});
	afterEach(() => {
		process.argv = stashedArgv;
		vi.resetAllMocks();
	});

	it.each(testFiles.map((file) => [file]))("baseline: %s", async (filename) => {
		const baseline = filename.replace(".lox", "");
		const expected = await maybeReadFile(`baselines/${baseline}.txt`);
		const errors = await maybeReadFile(`baselines/${baseline}.errors.txt`);
		process.argv = ["node", "gravlax.ts", `examples/${filename}`];
		await main();

		if (expected && expected !== "") {
			expect(logLines).toEqual(expected.trimEnd().split("\n"));
		} else {
			expect(log).not.toHaveBeenCalled();
		}

		if (errors && errors.length > 0) {
			expect(errorLines).toEqual(errors.trimEnd().split("\n"));
			expect(exit).toHaveBeenCalledOnce(); // TODO: check exit code
		} else {
			expect(error).not.toHaveBeenCalled();
			expect(exit).not.toHaveBeenCalled();
		}
	});
});
