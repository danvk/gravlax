#!/usr/bin/env node --loader ts-node/esm --no-warnings

// eslint-disable-next-line n/shebang
import { main } from "./main.js";

await main();
