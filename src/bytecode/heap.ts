interface HeapEntry {
	isLive: boolean;
	contents: unknown;
}

// null = garbage collected
const heap: (HeapEntry | null)[] = [];

export type Pointer = number & { __brand: "pointer" };

export function deref(pointer: Pointer) {
	if (pointer < 0 || pointer >= heap.length || !Number.isInteger(pointer)) {
		throw new Error(`Tried to dereference invalid pointer ${pointer}`);
	}
	const entry = heap[pointer];
	if (!entry?.isLive) {
		throw new Error(`Dereference after free: ${pointer}`);
	}
	return entry.contents;
}

export function alloc(contents: unknown): Pointer {
	heap.push({ isLive: true, contents });
	return (heap.length - 1) as Pointer;
}

export function free(pointer: Pointer) {
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
			console.log(`  freed ${i} (live)`, entry.contents);
		} else {
			console.log(`  collected ${i}`);
		}
		heap[i] = null;
	}
}
