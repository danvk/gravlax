interface HeapEntry {
	isLive: boolean;
	contents: unknown;
}

// null = garbage collected;
// start with a blank entry so that alloc() never returns zero.
const heap: (HeapEntry | null)[] = [null];

export type Pointer<T> = number & { __brand: "pointer"; __payload: T };

export function deref<T>(pointer: Pointer<T>): T {
	if (pointer < 0 || pointer >= heap.length || !Number.isInteger(pointer)) {
		throw new Error(`Tried to dereference invalid pointer ${pointer}`);
	}
	const entry = heap[pointer];
	if (!entry?.isLive) {
		throw new Error(`Dereference after free: ${pointer}`);
	}
	return entry.contents as T;
}

export function setPointer<T>(pointer: Pointer<T>, value: T) {
	deref(pointer);
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	heap[pointer]!.contents = value;
}

export function alloc<T>(contents: T): Pointer<T> {
	heap.push({ contents, isLive: true });
	return (heap.length - 1) as Pointer<T>;
}

export function free(pointer: Pointer<unknown>) {
	if (pointer < 0 || pointer >= heap.length || !Number.isInteger(pointer)) {
		throw new Error(`Tried to free invalid pointer ${pointer}`);
	}
	const entry = heap[pointer];
	if (!entry?.isLive) {
		throw new Error(`Double free: ${pointer}`);
	}
	entry.isLive = false;
}

// XXX this diverges a bit from the book.
export function freeObjects() {
	for (const [i, entry] of heap.entries()) {
		if (!entry) {
			continue;
		}
		if (entry.isLive) {
			// console.log(`  freed ${i} (live)`, entry.contents);
			console.log(`  freed ${i} (live)`);
		} else {
			console.log(`  collected ${i}`);
		}
		heap[i] = null;
	}
}
