import { error } from "./main.js";
import { Token } from "./token.js";
import { RESERVED_WORDS, TokenType } from "./token-type.js";

// TODO: I'd love this to be a generator function

function isDigit(c: string) {
	return c >= "0" && c <= "9";
}
function isAlpha(c: string) {
	return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c == "_";
}
const isAlphaNumeric = (c: string) => isDigit(c) || isAlpha(c);

function narrowingIncludes<T extends string>(arr: T[], x: string): x is T {
	return arr.includes(x as T);
}

export class Scanner {
	current = 0;
	line = 1;
	source: string;
	start = 0;
	tokens: Token[];

	constructor(source: string) {
		this.source = source;
		this.tokens = [];
	}

	#addCharToken(c: TokenType) {
		this.#addToken(c, null);
	}

	#addToken(type: TokenType, literal: Token["literal"]) {
		const lexeme = this.source.slice(this.start, this.current);
		this.tokens.push({
			lexeme,
			line: this.line,
			literal,
			type,
		});
	}

	#advance(): string {
		return this.source.charAt(this.current++);
	}

	#identifier() {
		while (isAlphaNumeric(this.#peek())) {
			this.#advance();
		}
		const text = this.source.slice(this.start, this.current);
		this.#addToken(
			narrowingIncludes(RESERVED_WORDS, text) ? text : "identifier",
			text,
		);
	}

	#isAtEnd() {
		return this.current >= this.source.length;
	}

	#match(expected: string) {
		if (this.#isAtEnd()) {
			return false;
		}
		if (this.#peek() !== expected) {
			return false;
		}
		this.current++;
		return true;
	}

	#number() {
		const char = this.source[this.start];
		const currency = char === "$" || char === "€" ? char : null;
		while (
			isDigit(this.#peek()) ||
			// a trailing comma might be part of an argument list.
			(this.#peek() === "," && isDigit(this.#peekNext()))
		) {
			this.#advance();
		}
		if (this.#peek() === "." && isDigit(this.#peekNext())) {
			this.#advance(); // consume the '.'
			while (isDigit(this.#peek())) {
				this.#advance();
			}
		}

		const numText = this.source
			.slice(this.start, this.current)
			.replace(/[$€,]/g, "");
		const value = Number(numText);
		this.#addToken("number", currency ? { currency, value } : value);
	}

	#peek() {
		if (this.#isAtEnd()) {
			return "\0";
		}
		return this.source.charAt(this.current);
	}

	#peekNext() {
		if (this.current + 1 >= this.source.length) {
			return "\0";
		}
		return this.source.charAt(this.current + 1);
	}

	#scanToken() {
		const c = this.#advance();
		switch (c) {
			case "(":
			case ")":
			case "{":
			case "}":
			case ",":
			case ".":
			case "-":
			case "+":
			case ";":
			case "*":
				this.#addCharToken(c);
				break;

			case "!":
			case "=":
			case "<":
			case ">": // neat that `${c}=` works at the type level!
				this.#addCharToken(this.#match("=") ? `${c}=` : c);
				break;

			case "/":
				if (this.#match("/")) {
					while (this.#peek() != "\n" && !this.#isAtEnd()) {
						this.#advance();
					}
				} else {
					this.#addCharToken(c);
				}
				break;

			case " ":
			case "\r":
			case "\t":
				break;

			case "\n":
				this.line++;
				break;

			case '"':
				this.#string();
				break;

			default:
				if (isDigit(c) || c === "$" || c === "€") {
					this.#number();
				} else if (isAlpha(c)) {
					this.#identifier();
				} else {
					error(this.line, `Unexpected character "${c}"`);
				}
		}
	}

	#string() {
		while (this.#peek() != '"' && !this.#isAtEnd()) {
			if (this.#peek() == "\n") {
				this.line++;
			}
			this.#advance();
		}
		if (this.#isAtEnd()) {
			error(this.line, "Unterminated string.");
			return;
		}
		this.#advance(); // closing quote.
		const value = this.source.slice(this.start + 1, this.current - 1);
		this.#addToken("string", value);
	}

	scanTokens(): Token[] {
		while (!this.#isAtEnd()) {
			// We are at the beginning of the next lexeme
			this.start = this.current;
			this.#scanToken();
		}

		this.tokens.push({
			lexeme: "",
			line: this.line,
			literal: null,
			type: "eof",
		});
		return this.tokens;
	}
}
