export function assertUnreachable(x: never): never {
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	throw new Error(`Reached the unreachable ${x}`);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop() {}
