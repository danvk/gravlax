import { TokenType } from "./token-type.js";

export interface Token {
	lexeme: string;
	line: number;
	literal: null | number | string;
	type: TokenType;
}

// export function tokenToString(token: Token): string {
// 	return `${token.type} ${token.lexeme} ${token.literal}`;
// }
