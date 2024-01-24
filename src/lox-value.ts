import { LoxCallable } from "./callable.js";

/** A value in a Lox program */
export type LoxValue =
	| CurrencyValue
	| LoxCallable
	| boolean
	| null
	| number
	| string;

export type Currency = "$" | "€";

export interface CurrencyValue {
	currency: Currency;
	value: number;
}

export function isCurrency(value: LoxValue): value is CurrencyValue {
	return value !== null && typeof value === "object" && "currency" in value;
}
