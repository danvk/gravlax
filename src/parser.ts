// Grammar:
// program        → declaration* EOF ;
// declaration    → varDecl | statement ;
// varDecl        → "var" IDENTIFIER ( "=" expression )? ";" ;
// statement      → exprStmt | forStmt | ifStmt | printStmt | whileStmt | block;
// block          → "{" declaration* "}" ;
// exprStmt       → expression ";" ;
// printStmt      → "print" expression ";" ;
// ifStmt         → "if" "(" expression ")" statement ( "else" statement )? ;
// whileStmt      → "while" "(" expression ")" statement ;
// forStmt        → "for" "(" ( varDecl | exprStmt | ";" ) expression? ";" expression? ")" statement ;
// expression     → assignment;
// assignment     → IDENTIFIER "=" assignment | logic_or;
// logic_or       → logic_and ( "or" logic_and )* ;
// logic_and      → equality ( "and" equality )* ;
// equality       → comparison ( ( "!=" | "==" ) comparison )* ;
// comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
// term           → factor ( ( "-" | "+" ) factor )* ;
// factor         → unary ( ( "/" | "*" ) unary )* ;
// unary          → ( "!" | "-" ) unary | call ;
// call           → primary ( "(" arguments? ")" )* ;
// arguments      → expression ( "," expression )* ;
// primary        → NUMBER | STRING | "true" | "false" | "nil"
//                | "(" expression ")" ;
//                | IDENTIFIER ;

import { Call, Expr, Expression, Print, Stmt, VarStmt } from "./ast.js";
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
		if (match("for")) {
			return forStatement();
		} else if (match("if")) {
			return ifStatement();
		} else if (match("print")) {
			return printStatement();
		} else if (match("while")) {
			return whileStatement();
		} else if (match("{")) {
			return { kind: "block", statements: block() };
		}
		return expressionStatement();
	};

	// ifStmt         → "if" "(" expression ")" statement ( "else" statement )? ;
	const ifStatement = (): Stmt => {
		consume("(", "Expect '(' after 'if'.");
		const condition = expression();
		consume(")", "Expect ')' after if condition.");
		const thenBranch = statement();
		const elseBranch = match("else") ? statement() : null;
		return { condition, elseBranch, kind: "if", thenBranch };
	};

	// whileStmt      → "while" "(" expression ")" statement ;
	const whileStatement = (): Stmt => {
		consume("(", "Expect '(' after 'while'.");
		const condition = expression();
		consume(")", "Expect ')' after condition.");
		const body = statement();
		return { body, condition, kind: "while" };
	};

	// forStmt        → "for" "(" ( varDecl | exprStmt | ";" ) expression? ";" expression? ")" statement ;
	const forStatement = (): Stmt => {
		consume("(", "Expect '(' after 'for'.");
		let initializer;
		if (match(";")) {
			initializer = null;
		} else if (match("var")) {
			initializer = varDeclaration();
		} else {
			initializer = expressionStatement();
		}
		let condition = check(";") ? null : expression();
		consume(";", "Expect ';' after loop condition.");
		const increment = check(")") ? null : expression();
		consume(")", "Expect ')' after for clauses.");
		let body = statement();

		// desugaring
		if (increment) {
			body = {
				kind: "block",
				statements: [body, { expression: increment, kind: "expr" }],
			};
		}

		condition ??= { kind: "literal", value: true };
		body = { body, condition, kind: "while" };

		if (initializer) {
			body = { kind: "block", statements: [initializer, body] };
		}

		return body;
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
		const expr = or();
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

	const or = (): Expr => {
		let expr = and();
		while (match("or")) {
			const operator = previous();
			const right = and();
			expr = { kind: "logical", left: expr, operator, right };
		}
		return expr;
	};

	const and = (): Expr => {
		let expr = equality();
		while (match("and")) {
			const operator = previous();
			const right = and();
			expr = { kind: "logical", left: expr, operator, right };
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
		return call();
	};

	const call = (): Expr => {
		let expr = primary();
		while (true) {
			if (match("(")) {
				expr = finishCall(expr);
			} else {
				break;
			}
		}
		return expr;
	};

	const finishCall = (callee: Expr): Expr => {
		const args: Expr[] = [];
		if (!check(")")) {
			do {
				if (args.length >= 255) {
					// XXX won't this flag _all_ args past 255?
					error(peek(), "Can't have more than 255 arguments.");
				}
				args.push(expression());
			} while (match(","));
		}
		const paren = consume(")", "Expect ')' after arguments.");
		return { args, callee, kind: "call", paren };
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
