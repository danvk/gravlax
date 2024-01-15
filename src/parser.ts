// Grammar:
// program        → statement* EOF ;
// statement      → exprStmt | printStmt ;
// exprStmt       → expression ";" ;
// printStmt      → "print" expression ";" ;
// expression     → equality ;
// equality       → comparison ( ( "!=" | "==" ) comparison )* ;
// comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
// term           → factor ( ( "-" | "+" ) factor )* ;
// factor         → unary ( ( "/" | "*" ) unary )* ;
// unary          → ( "!" | "-" ) unary
//                | primary ;
// primary        → NUMBER | STRING | "true" | "false" | "nil"
//                | "(" expression ")" ;

import { Expr, Expression, Print, Stmt } from "./ast.js";
import { errorOnToken } from "./main.js";
import { Token } from "./token.js";
import { TokenType } from "./token-type.js";

export class ParseError extends Error {}

export function parse(tokens: Token[]) {
	let current = 0;

	// #region Helpers
	const isAtEnd = () => peek().type == "eof";
	const peek = () => tokens[current];
	const previous = () => tokens[current - 1];
	const check = (type: TokenType) => {
		return !isAtEnd() && peek().type == type;
	};
	const advance = () => {
		if (!isAtEnd()) {
			current++;
		}
		return previous();
	};
	const match = (...types: TokenType[]) => {
		for (const type of types) {
			if (check(type)) {
				advance();
				return true;
			}
		}
		return false;
	};
	// #endregion

	// #region Error Handling
	const consume = (type: TokenType, message: string) => {
		if (check(type)) {
			return advance();
		}
		throw error(peek(), message);
	};
	const error = (token: Token, message: string) => {
		errorOnToken(token, message);
		return new ParseError();
	};
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const synchronize = (): void => {
		advance();
		while (!isAtEnd()) {
			if (previous().type == ";") {
				return;
			}

			switch (peek().type) {
				case "class":
				case "fun":
				case "var":
				case "for":
				case "if":
				case "while":
				case "print":
				case "return":
					return;
			}
			advance();
		}
	};
	// #endregion

	// #region The grammar
	// statement      → exprStmt | printStmt ;
	const statement = () => {
		if (match("print")) {
			return printStatement();
		}
		return expressionStatement();
	};

	// exprStmt       → expression ";" ;
	const expressionStatement = (): Expression => {
		const expr = expression();
		consume(";", "Expect ';' after expression.");
		return { expression: expr, kind: "expr" };
	};

	// printStmt      → "print" expression ";" ;
	const printStatement = (): Print => {
		const expr = expression();
		consume(";", "Expect ';' after expression.");
		return { expression: expr, kind: "print" };
	};

	// expression     → equality ;
	const expression = () => equality();

	// unary          → ( "!" | "-" ) unary | primary ;
	const unary = (): Expr => {
		if (match("!", "-")) {
			const operator = previous();
			const right = unary();
			return { kind: "unary", operator, right };
		}
		return primary();
	};

	// primary        → NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" ;
	const primary = (): Expr => {
		if (match("false")) {
			return { kind: "literal", value: false };
		} else if (match("true")) {
			return { kind: "literal", value: true };
		} else if (match("nil")) {
			return { kind: "literal", value: null };
		} else if (match("number", "string")) {
			return { kind: "literal", value: previous().literal };
		} else if (match("(")) {
			const expr = expression();
			consume(")", "Expect ')' after expression.");
			return { expr, kind: "grouping" };
		}
		throw error(peek(), "Expect expression.");
	};

	// Creates a parsing function for a rule of this form:
	// rule → next ( ( any of ops ) next )* ;
	const parseBinaryOp = (ops: TokenType[], next: () => Expr) => {
		return (): Expr => {
			let expr: Expr = next();
			while (match(...ops)) {
				const operator = previous();
				const right = next();
				expr = { kind: "binary", left: expr, operator, right };
			}
			return expr;
		};
	};

	// These productions are all of the form:
	// equality → comparison ( ( "!=" | "==" ) comparison )* ;
	const factor = parseBinaryOp(["/", "*"], unary);
	const term = parseBinaryOp(["-", "+"], factor);
	const comparison = parseBinaryOp([">", ">=", "<", "<="], term);
	const equality = parseBinaryOp(["!=", "=="], comparison);
	// #endregion

	try {
		// program        → statement* EOF ;
		const statements: Stmt[] = [];
		while (!isAtEnd()) {
			statements.push(statement());
		}
		return statements;
	} catch (e) {
		if (e instanceof ParseError) {
			return null;
		}
		throw e;
	}
}
