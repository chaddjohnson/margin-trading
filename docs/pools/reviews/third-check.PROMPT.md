# Brief for the focused third check (sent verbatim to a fresh agent; scratch path shortened)

You are an independent reviewer who did not write this code. Repository: the working directory. A second review
(`docs/pools/reviews/second-review.md`) found one material defect and several minor items. Fixes are recorded in
`docs/pools/WORK_RECOVERY.md` §7, and their tests are in `src/pools/tests/`. A write-once prospective freeze will
bind `research/prospective-b4-b5-shadow/PROTOCOL.md` and the code closure right after your check.

**Scope.** Check only that:
1. each §7 item is resolved, citing files and lines;
2. no fix introduced a new defect;
3. `PROTOCOL.md` now matches the code.

Be concise. Same hard rules as before:
- read-only;
- no `forward freeze`, `forward import` or `research export`;
- pool runs only with `--out` in your scratch directory;
- no `.env`, network or broker.

Allowed: `git diff`, `node --experimental-transform-types --disable-warning=ExperimentalWarning --test
src/pools/tests/*.test.ts`, tsc, eslint, `npm run pools -- verify`, and read-only scripts in scratch. Node:
`export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.

Report:
- the checks you ran;
- material findings, if any;
- minor findings;
- a one-line verdict: is it safe to make the real freeze now?
