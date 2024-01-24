import { CurrencyValue, isCurrency } from "./lox-value.js";
import { TokenType } from "./token-type.js";

export interface Token {
	lexeme: string;
	line: number;
	// XXX: not all TokenTypes should have "literal"
	literal: CurrencyValue | null | number | string;
	type: TokenType;
}

export function tokenToString(token: Token): string {
	const { lexeme, literal, type } = token;
	const str = isCurrency(literal)
		? `${literal.currency}${literal.value}`
		: String(literal);
	return `'${lexeme}': ${type}` + (literal !== null ? `: ${str}` : "");
}
