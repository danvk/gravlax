export function add(a: number, b: number) {
	return a + b;
}

export function main() {
	const args = process.argv.slice(2);
	console.log(args);
}
