# Brief for the independent read-only review of the pools work (sent verbatim to a fresh agent)

You are an independent reviewer. You did not write this code. Repository: the working directory (a TypeScript/Node
margin-trading backtester). Review the new, uncommitted work described in `docs/pools/README.md` and
`docs/pools/WORK_RECOVERY.md`:

- `config/pools/{B4,B5}.json`;
- `src/pools/` (schema, load, run, report, verify, research, cli, `forward/`, tests);
- `src/app/pools.ts`;
- `config/research-pools/diverse-d1-2026-10-26/`;
- `research/prospective-b4-b5-shadow/PROTOCOL.md`.

Find defects; do not fix anything.

**Hard rules.**
- Do not edit, create, move or delete repository files.
- Do **not** run `npm run pools -- forward freeze`, `forward import` or `research export`. They are write-once and
  the real freeze has deliberately not been made yet.
- You may run:
  - `npm run pools -- list|show|validate|verify|research list|research show …|research verify|forward status|forward report`;
  - `fixed`/`portfolio`/`compare`/`costs` **with `--out <your scratch dir>`**;
  - `npx tsc --noEmit`, `npx eslint src/pools`;
  - `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/pools/tests/*.test.ts`;
  - read-only Python or shell.
- Node: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`. Put scripts in your own
  scratch directory, which is given below.
- Never read `.env`. No network, broker, order or download. Never backtest a diverse-d1 finalist on data after
  2023-12-29.

**Verify, citing files and lines:**

1. **Provenance of B4/B5.**
   - Are the five books (VGT primary, XBI/XRT/KRE lowDd, GDX portfolioAware) exactly the frozen research books?
   - Check against `config/phenotypes/D1/*.json`, `research/portfolio-aware-d1-optimization/FROZEN_SELECTION.json`
     (S0 and P-add-GDX) and `src/joint-16-etf-d1/benchmarks.ts`.
   - Are the hashes and pins sound? Can a phenotype edit slip through the loader?
2. **Funding semantics.** Does `npm run pools -- fixed` really run:
   - one shared slot;
   - a constant non-compounding $100,000 per funded trade;
   - the frozen shadow policy with alphabetical same-minute order;
   - 11% simple interest;
   - 5 bps per side?

   Is the portfolio mode the frozen one, and are the two dividend conventions right? Is any report figure mislabelled
   (minute vs daily drawdown, % denominators, fixed P&L vs portfolio growth)?
3. **Regression.**
   - Does `verify` genuinely compare against the frozen controls and ledgers without weakened tolerances?
   - Is `newSymbols: ["GDX"]` in B5's frozen reference legitimate, or does it hide a difference?
4. **Research archive.**
   - Are the 15 finalists exact copies of the sealed `research/d1-diverse-pool-discovery/results/rounds/final/select/{J-u,T-u}/assessment.json`?
   - Are they unreachable from any run command?
5. **Prospective boundary** (`src/pools/forward/`, `PROTOCOL.md`). Check:
   - the cutoff handling;
   - carried-lot attribution;
   - interest, friction and borrowing-day accounting with no double counting;
   - the drawdown peak reset (including `windowedMinuteDrawdown` reuse and its 11% assumption);
   - the snapshot checks (calendar, holidays, split detection, distributions);
   - composition (the canonical files unchanged);
   - the freeze binding (the code import closure, data, pools, cutoff state) and its refusals;
   - the no-data path, which must never invent P&L;
   - the matched-borrowing ladder.

   Can any path read or use post-cutoff bars before the freeze, or let a forward figure include pre-cutoff P&L?
6. **Protocol and decision.**
   - Is deferring the challengers consistent with the diverse-d1 protocol?
   - Does `PROTOCOL.md` match what the code does?
7. **Security, isolation and regressions.**
   - No `.env` load, credential, network or broker code.
   - No edit to frozen studies, data, splits, partitions, distributions or phenotype JSONs; check `git status` and
     `git diff`.
   - Do the existing tests still pass?
8. Anything else that would make a figure, a command or the docs wrong or misleading.

**Report format:**
- the checks you ran;
- material findings, which would make a figure, guard or claim wrong;
- minor findings;
- observations;
- a one-line verdict: is it safe to make the real write-once prospective freeze as the code stands?
