import { beforeEach, describe, expect, it } from "vitest";

import { add } from "./main.js";

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

describe("main", () => {
	let stashedArgv = process.argv;
	beforeEach(() => {});
});
