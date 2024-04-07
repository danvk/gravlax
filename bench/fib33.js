function fib(n) {
	if (n < 2) {
		return n;
	}
	return fib(n - 1) + fib(n - 2);
}

var before = Date.now();
console.log(fib(33));
var after = Date.now();
console.log("Time elapsed (ms):");
console.log(after - before);
