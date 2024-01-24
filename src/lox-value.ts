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
