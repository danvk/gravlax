import { defineConfig } from "tsup";

export default defineConfig({
	bundle: false,
	clean: true,
	dts: false,
	entry: ["src/**/*.ts", "!src/**/*.test.*"],
	format: "esm",
	outDir: "lib",
	sourcemap: true,
});
