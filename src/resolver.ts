import {
	Expr,
	ExpressionVisitor,
	Func,
	Stmt,
	StmtVisitor,
	visitExpr,
	visitStmt,
} from "./ast.js";
import { Interpreter } from "./interpreter.js";
import { errorOnToken } from "./main.js";
import { Token } from "./token.js";

type FunctionType = "function" | "method" | "none";

export function makeResolver(interpreter: Interpreter) {
	const scopes: Map<string, boolean>[] = [];
	let currentFunc: FunctionType = "none";

	const beginScope = () => {
		scopes.push(new Map());
	};
	const endScope = () => scopes.pop();
	const declare = (name: Token) => {
		const scope = scopes.at(-1);
		if (!scope) {
			return;
		}
		if (scope.has(name.lexeme)) {
			errorOnToken(name, "Already a variable with this name in this scope.");
		}
		scope.set(name.lexeme, false);
	};
	const define = (name: Token) => {
		scopes.at(-1)?.set(name.lexeme, true);
	};

	// XXX the book uses overloads here
	const resolve = (stmt: Stmt) => {
		visitStmt(stmt, resolver);
	};
	const resolveExpr = (expr: Expr) => {
		visitExpr(expr, resolver);
	};
	const resolveStmts = (stmts: Stmt[]) => {
		stmts.forEach(resolve);
	};
	const resolveLocal = (expr: Expr, name: Token) => {
		for (let i = scopes.length - 1; i >= 0; i--) {
			if (scopes[i].has(name.lexeme)) {
				interpreter.resolve(expr, scopes.length - 1 - i);
				return;
			}
		}
	};
	const resolveFunction = (func: Func, funcType: FunctionType) => {
		const enclosingFuncType = currentFunc;
		currentFunc = funcType;
		beginScope();
		for (const param of func.params) {
			declare(param);
			define(param);
		}
		resolveStmts(func.body);
		endScope();
		currentFunc = enclosingFuncType; // TODO: try a using statement!
	};

	// TODO: try to factor out some boilerplate here.
	const resolver: ExpressionVisitor<void> & StmtVisitor<void> = {
		assign(expr) {
			resolveExpr(expr.value);
			resolveLocal(expr, expr.name);
		},
		binary(expr) {
			resolveExpr(expr.left);
			resolveExpr(expr.right);
		},
		block(block) {
			beginScope();
			resolveStmts(block.statements);
			endScope();
		},
		call(expr) {
			resolveExpr(expr.callee);
			expr.args.forEach(resolveExpr);
		},
		class(stmt) {
			declare(stmt.name);
			define(stmt.name);
			beginScope();
			// TODO: write a peek() to enforce that -1 works.
			scopes.at(-1)?.set("this", true);
			for (const method of stmt.methods) {
				resolveFunction(method, "method");
			}
			endScope();
		},
		expr(stmt) {
			resolveExpr(stmt.expression);
		},
		func(stmt) {
			declare(stmt.name);
			define(stmt.name);
			resolveFunction(stmt, "function");
		},
		get(expr) {
			resolveExpr(expr.object);
		},
		grouping(expr) {
			resolveExpr(expr.expr);
		},
		if(stmt) {
			resolveExpr(stmt.condition);
			resolve(stmt.thenBranch);
			if (stmt.elseBranch) {
				resolve(stmt.elseBranch);
			}
		},
		literal() {
			/* no op */
		},
		logical(expr) {
			resolveExpr(expr.left);
			resolveExpr(expr.right);
		},
		print(stmt) {
			resolveExpr(stmt.expression);
		},
		return(stmt) {
			if (currentFunc == "none") {
				errorOnToken(stmt.keyword, "Can't return from top-level code.");
			}
			if (stmt.value) {
				resolveExpr(stmt.value);
			}
		},
		set(expr) {
			resolveExpr(expr.value);
			resolveExpr(expr.object);
		},
		this(expr) {
			resolveLocal(expr, expr.keyword);
		},
		unary(expr) {
			resolveExpr(expr.right);
		},
		"var-expr"(expr) {
			if (scopes.at(-1)?.get(expr.name.lexeme) === false) {
				errorOnToken(
					expr.name,
					"Can't read local variable in its own initializer.",
				);
			}
			resolveLocal(expr, expr.name);
		},
		"var-stmt"(stmt) {
			declare(stmt.name);
			if (stmt.initializer) {
				resolveExpr(stmt.initializer);
			}
			define(stmt.name);
		},
		while(stmt) {
			resolveExpr(stmt.condition);
			resolve(stmt.body);
		},
	};
	return { resolve, resolveExpr, resolveStmts };
}
