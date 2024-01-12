import { TokenType } from "./token-type.js";

export interface Token {
	isCurrency?: boolean;
	lexeme: string;
	line: number;
	// XXX: not all TokenTypes should have "literal"
	literal: null | number | string;
	type: TokenType;
}

export function tokenToString(token: Token): string {
	return (
		`'${token.lexeme}': ${token.type}` +
		(token.literal !== null
			? `: ${token.isCurrency ? "$" : ""}${token.literal}`
			: "")
	);
}
