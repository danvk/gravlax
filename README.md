<h1 align="center">Gravlax</h1>

<p align="center">A Lox interpreter with tasty TypeScript seasoning</p>

<p align="center">
	<!-- prettier-ignore-start -->
	<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
	<a href="#contributors" target="_blank"><img alt="👪 All Contributors: 2" src="https://img.shields.io/badge/%F0%9F%91%AA_all_contributors-2-21bb42.svg" /></a>
<!-- ALL-CONTRIBUTORS-BADGE:END -->
	<!-- prettier-ignore-end -->
	<a href="https://github.com/danvk/gravlax/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank"><img alt="🤝 Code of Conduct: Kept" src="https://img.shields.io/badge/%F0%9F%A4%9D_code_of_conduct-kept-21bb42" /></a>
	<a href="https://codecov.io/gh/danvk/gravlax" target="_blank"><img alt="🧪 Coverage" src="https://img.shields.io/codecov/c/github/danvk/gravlax?label=%F0%9F%A7%AA%20coverage" /></a>
	<a href="https://github.com/danvk/gravlax/blob/main/LICENSE.md" target="_blank"><img alt="📝 License: MIT" src="https://img.shields.io/badge/%F0%9F%93%9D_license-MIT-21bb42.svg"></a>
	<a href="http://npmjs.com/package/gravlax"><img alt="📦 npm version" src="https://img.shields.io/npm/v/gravlax?color=21bb42&label=%F0%9F%93%A6%20npm" /></a>
	<img alt="💪 TypeScript: Strict" src="https://img.shields.io/badge/%F0%9F%92%AA_typescript-strict-21bb42.svg" />
</p>

This is my implementation of an interpreter for the Lox language from Robert Nystrom's _[Crafting Interpreters]_.
I'm building this as part of my Winter 2024 batch at the [Recurse Center].

## Usage

```shell
npx gravlax [file.lox]
```

## Departures from the book

### Features not in the book

There's one notable feature I added beyond what's in the text of _Crafting Interpreters_: support for commas as numeric separators and currencies as first-class values.

You can write `1,234 + 2,456` and gravlax will happily print out `3690`.
Note that this has the… interesting side effect of making the grammar whitespace-sensitive:
`f(1,2)` and `f(1, 2)` parse differently (the former is a one-argument call).

You can also write out currency values like `$123` or `€456` and do math on them.
The operations you'd expect to work will work: adding or subtracting values from the
same currency is OK, multiply a currency by a scalar is OK, etc:

```text
> ($1,234 + $2,345) / 10
$357.9
> $12 + €23
MixedCurrencyError: Operands must be the same currency.
```

Two other niceties:

1. Support for expressions in the REPL ([Chapter 8 Challenge 1]).
   If you run `npx gravlax` and then `1+2`, it will print `3`.
   No need to write a `print` statement.
   This makes it possible to use gravlax as a calculator.

2. The REPL uses readline so you can hit up arrow to get the previous expression and edit it.

### Implementation details

Rather than representing AST nodes as classes, I used TypeScript `interface`s and
a discriminated union for `Expr` and `Stmt`.
This means that we don't need a codegen step.
It also means that we [don't need the visitor pattern]:
pattern-matching with `switch`/`case` is more idiomatic and less code.

While I used a class for the Scanner (same as the book), I used a closure for the parser.
Mostly this just means less writing `this` dot whatever.

## Performance

On my machine, gravlax runs the [Fibonacci code] from Chapter 14 in ~3 minutes (174 seconds).
Compare this with 27s for jlox.
So we're ~6x slower than Java.

In jlox and gravlax, returning from a function is implemented by throwing an exception.
It's critical that this class not derive from `Error`, so that it doesn't carry
along stack traces:

```text
- class ReturnCall extends Error {
+ class ReturnCall {
```

The latter winds up being ~10x faster than the former.
This is the JS equivalent of the [weird] `super(null, null, false, false)` call in jlox.
See [#37].

## Development

```shell
pnpm install
pnpm test
pnpm repl
```

## Contributors

<!-- spellchecker: disable -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://effectivetypescript.com/"><img src="https://avatars.githubusercontent.com/u/98301?v=4?s=100" width="100px;" alt="Dan Vanderkam"/><br /><sub><b>Dan Vanderkam</b></sub></a><br /><a href="https://github.com/danvk/gravlax/commits?author=danvk" title="Code">💻</a> <a href="#content-danvk" title="Content">🖋</a> <a href="https://github.com/danvk/gravlax/commits?author=danvk" title="Documentation">📖</a> <a href="#ideas-danvk" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-danvk" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-danvk" title="Maintenance">🚧</a> <a href="#projectManagement-danvk" title="Project Management">📆</a> <a href="#tool-danvk" title="Tools">🔧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.joshuakgoldberg.com/"><img src="https://avatars.githubusercontent.com/u/3335181?v=4?s=100" width="100px;" alt="Josh Goldberg ✨"/><br /><sub><b>Josh Goldberg ✨</b></sub></a><br /><a href="#tool-JoshuaKGoldberg" title="Tools">🔧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- spellchecker: enable -->

<!-- You can remove this notice if you don't want it 🙂 no worries! -->

> 💙 This package was templated with [`create-typescript-app`](https://github.com/JoshuaKGoldberg/create-typescript-app).

[Crafting Interpreters]: https://craftinginterpreters.com/contents.html
[Recurse Center]: https://www.recurse.com/
[Chapter 8 Challenge 1]: https://craftinginterpreters.com/statements-and-state.html#challenges
[don't need the visitor pattern]: https://github.com/danvk/gravlax/pull/35
[Fibonacci code]: https://craftinginterpreters.com/chunks-of-bytecode.html
[#37]: https://github.com/danvk/gravlax/pull/37
[weird]: https://craftinginterpreters.com/functions.html
