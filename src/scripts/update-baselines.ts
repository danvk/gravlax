// Run lox files in /examples, updating corresponding files in /baselines

import * as fs from "node:fs/promises";

import { Interpreter } from "../interpreter.js";
import { run } from "../main.js";

function dirname(path: string) {
	const idx = path.lastIndexOf("/");
	if (idx === -1) {
		return null;
	}
	return path.slice(0, idx);
}

async function processFile(loxFile: string) {
	const dirs = dirname(loxFile);
	if (dirs) {
		await fs.mkdir(`baselines/${dirs}`, { recursive: true });
	}
	const baseline = loxFile.replace(".lox", "");
	const outputFile = `baselines/${baseline}.txt`;
	const errorsFile = `baselines/${baseline}.errors.txt`;

	const trueLog = console.log;
	const trueError = console.error;
	const logLines: string[] = [];
	const errorLines: string[] = [];
	console.log = (line: string) => {
		logLines.push(line);
	};
	console.error = (line: string) => {
		errorLines.push(line);
	};

	try {
		const contents = await fs.readFile("examples/" + loxFile, "utf-8");
		const interpreter = new Interpreter();
		run(interpreter, contents);
	} finally {
		console.log = trueLog;
		console.error = trueError;
	}

	if (logLines.length) {
		console.log(`  wrote ${logLines.length} lines to ${outputFile}`);
		await fs.writeFile(outputFile, logLines.join("\n") + "\n", "utf-8");
	}
	if (errorLines.length) {
		console.log(`  wrote ${errorLines.length} lines to ${errorsFile}`);
		await fs.writeFile(errorsFile, errorLines.join("\n") + "\n", "utf-8");
	}
}

async function main() {
	await fs.mkdir("baselines", { recursive: true });
	// Note: recursive requires node 20+
	const files = await fs.readdir("examples", { recursive: true });
	for (const file of files) {
		if (file.endsWith(".lox")) {
			console.log(file);
			await processFile(file);
		}
		break;
	}
}

await main();
