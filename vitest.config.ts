import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		clearMocks: true,
		coverage: {
			all: true,
			exclude: ["lib", "src/scripts"],
			include: ["src"],
			reporter: [
				[
					"html-spa",
					{ metricsToShow: ["branches", "functions", "lines", "statements"] },
				],
				"lcov",
			],
		},
		exclude: ["lib", "node_modules"],
		setupFiles: ["console-fail-test/setup"],
	},
});
