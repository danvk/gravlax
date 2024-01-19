// Grammar:
// program        → declaration* EOF ;
// declaration    → varDecl | statement ;
// varDecl        → "var" IDENTIFIER ( "=" expression )? ";" ;
// statement      → exprStmt | ifStmt | printStmt | block;
// block          → "{" declaration* "}" ;
// exprStmt       → expression ";" ;
// printStmt      → "print" expression ";" ;
// ifStmt         → "if" "(" expression ")" statement ( "else" statement )? ;
// expression     → assignment;
// assignment     → IDENTIFIER "=" assignment | equality;
// equality       → comparison ( ( "!=" | "==" ) comparison )* ;
// comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
// term           → factor ( ( "-" | "+" ) factor )* ;
// factor         → unary ( ( "/" | "*" ) unary )* ;
// unary          → ( "!" | "-" ) unary
//                | primary ;
// primary        → NUMBER | STRING | "true" | "false" | "nil"
//                | "(" expression ")" ;
//                | IDENTIFIER ;

import { Expr, Expression, Print, Stmt, VarStmt } from "./ast.js";
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
	// declaration    → varDecl | statement ;
	const declaration = () => {
		try {
			if (match("var")) {
				return varDeclaration();
			}
			return statement();
		} catch (e) {
			if (e instanceof ParseError) {
				synchronize();
			} else {
				throw e;
			}
		}
	};

	// varDecl        → "var" IDENTIFIER ( "=" expression )? ";" ;
	const varDeclaration = (): VarStmt => {
		const name = consume("identifier", "Expect variable name.");
		let initializer: Expr | null = null;
		if (match("=")) {
			initializer = expression();
		}
		consume(";", "Expect ';' after variable declaration.");
		return { initializer, kind: "var-stmt", name };
	};

	// statement      → exprStmt | printStmt | block ;
	const statement = (): Stmt => {
		if (match("print")) {
			return printStatement();
		} else if (match("{")) {
			return { kind: "block", statements: block() };
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

	const block = (): Stmt[] => {
		const statements = [];
		while (!check("}") && !isAtEnd()) {
			const d = declaration();
			if (d) {
				statements.push(d);
			}
		}
		consume("}", "Expect '}' after block.");
		return statements;
	};

	// expression     → assignment ;
	const expression = () => assignment();

	// assignment     → IDENTIFIER "=" assignment | equality;
	const assignment = (): Expr => {
		const expr = equality();
		if (match("=")) {
			const equals = previous();
			const value = assignment();
			if (expr.kind == "var-expr") {
				const name = expr.name;
				return { kind: "assign", name, value };
			}
			error(equals, "Invalid assignment target.");
		}
		return expr;
	};

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
		} else if (match("identifier")) {
			return { kind: "var-expr", name: previous() };
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
			const decl = declaration();
			if (decl) {
				statements.push(decl);
			}
		}
		return statements;
	} catch (e) {
		if (e instanceof ParseError) {
			return null;
		}
		throw e;
	}
}
