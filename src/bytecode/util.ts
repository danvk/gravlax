export function assertUnreachable(x: never): never {
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	throw new Error(`Reached the unreachable ${x}`);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop() {}

export function arrayWith<T>(n: number, cb: (i: number) => T): T[] {
	const arr = new Array(n);
	for (let i = 0; i < n; i++) {
		arr[i] = cb(i);
	}
	return arr;
}
