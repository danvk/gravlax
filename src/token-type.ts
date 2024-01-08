/* eslint-disable perfectionist/sort-union-types */
export type TokenType =
	// Single-character tokens
	| "("
	| ")"
	| "{"
	| "}"
	| ","
	| "."
	| "-"
	| "+"
	| ":"
	| "/"
	| "*"
	// One or two character tokens
	| "!"
	| "!="
	| "="
	| "=="
	| ">"
	| ">="
	| "<"
	| "<="
	// Literals
	| "number"
	| "identifier"
	| "string"
	// Keywords
	| "and"
	| "class"
	| "else"
	| "false"
	| "for"
	| "fun" // XXX out of order in the book
	| "if"
	| "nil"
	| "or"
	| "print"
	| "return"
	| "super"
	| "this"
	| "true"
	| "var"
	| "while"
	| "eof";
/* eslint-enable */
