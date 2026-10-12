// Runs the reference copy of allIn.ts on an explicit data file:
// node --experimental-transform-types research/risk-management/baseline/reference/run_reference.ts SYMBOL START|- END|- FILE
import run from './allIn_reference.ts';

const [, , symbol, start, end, file] = process.argv;
await run(symbol, start === '-' ? undefined : start, end === '-' ? undefined : end, file);
