# Standalone VGT versus B4/B5 robustness audit — recovery checkpoint

## Top screen

- **Updated:** 2026-10-27T13:44Z (UTC).
- **Status:** **COMPLETE, committed and pushed.** The study is commit `91c3b2e7eac6d075d5ab8856b83cc28d1cec5857` on
  branch `research/vgt-standalone-vs-pooled-robustness`.
  - Pushed to `origin` at 2026-10-27T13:44:08Z as a new branch with upstream set. `git ls-remote` showed the remote
    head = `91c3b2e7`.
  - This checkpoint update is a follow-up commit, pushed the same way.
  - No PR was created and no other branch was pushed or merged. `origin` has no `research/b4-b5-robustness-audit`
    branch; its commits are carried only as history.
- **Authoritative protocol:** `PROTOCOL.md`.
  - Frozen 2026-10-27T13:02:32Z at `1545f48d890f69f89668c58fee18731da128af0c98c487108639433daaa7a31a`.
  - Amendment head **A1** (13:11:51Z; a rationale correction, no rule change):
    `11fccfe77172493697116f4e91dca0bf75d921a4b290903026ae22e4e6d8f444`.
  - Freeze record: `PROTOCOL_FREEZE.json` `2f42ba1d…`.
- **Tested:** VGT-primary only. **No VGT lowDd exists** (`VGT_PHENOTYPE_INVENTORY.md` `2b2bcbd9…`).
- **Verdicts** (`FINAL_COMPARISON_AND_RECOMMENDATION.md`):
  - (a) **plausible but thinly evidenced**;
  - (b) **pools more robust on matched 8-D tests**: vs B5 0/7/1, vs B4 1/7/0;
  - (c) **merits prospective observation**; live deployment not concluded;
  - overall (§11 rule): **both worth parallel observation**. The B5 rule failed only its drawdown condition, by
    0.06 pp on seed 1; seed 2 points the same way.
- **Running:** no process.
- **Next step:** none. Any prospective observation of S (via the VGT book's virtual trades) is the user's decision
  and would need its own frozen protocol before any post-cutoff bar. Never rerun `run`; the stored records are final.

## Environment

- **Working directory:** the repository root for every command.
- **Branch:** `research/vgt-standalone-vs-pooled-robustness`, created 2026-10-27T12:47:45Z from `7a962151` (the
  B4/B5 robustness-audit head, which holds the completed audit `3c0ee0f3`).
  - The parent branch was never pushed. Pushing this branch carries those commits as history but moves no other
    remote branch.
- **Working tree before the study commit** (clean after it, apart from ignored files):
  - `M package.json` (+ the `vgt-robustness` script only);
  - `?? research/vgt-standalone-vs-pooled-robustness/`;
  - `?? src/vgt-standalone-robustness/`.
- **Local only:**
  - `results/logs/` (ignored by the repository's `logs/` rule);
  - `evaluations/` (ignored);
  - the pre-existing `research/btcusdt-d1/` (ignored, not ours, never staged).
- **Runtime:** Node v24.21.0: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`. 10
  cores, 16 GB.
- **No credentials, network or broker.**

## Authority and read-only inputs (verified unchanged by `npm run vgt-robustness -- verify`, 13:42Z)

- **Prior audit:** `research/b4-b5-robustness-audit/` — protocol `73913413…`, MANIFEST `794a6ffd…`, analysis
  `331bc9a6…`, runs `book.jsonl` `07ef28b1…`, `oat.jsonl` `8be209e6…`, `cost.jsonl` `6a9c6e18…`.
- **Pools:** `config/pools/B4.json` `4ca5aa1a…` and `B5.json` `deef53ca…`.
- **Phenotype:** `config/phenotypes/D1/VGT.json` `3e77a419…`.
- **Prospective freeze:** `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` `0dabd97e…`.
  - `npm run pools -- forward status`: the body `407a669b…` "verifies"; observations 0.
- **Frozen controls:** `research/joint-16-etf-d1/results/controls/controls.json` `2bd521dc…`. B1 = VGT D1 alone.
- **Data:** VOOG `a7aa42ae…`, VGT `d8e6991d…`, XBI `9afecc06…`, XRT `ca0fdc6a…`, KRE `40e7bd6c…`, GDX `86ce101f…`.
  `all` covers 2016-01-04 → 2026-10-13 (2,710 sessions). No later bar was read.
- **Full list with hashes:** `MANIFEST.json` `readOnlyInputs` (MANIFEST sha256 `6527b26c…`).

## Stage table

| # | Stage | Status | Command | Output / record | Notes |
|---|---|---|---|---|---|
| 1 | Inspection + inventory | complete 13:01Z | — | `VGT_PHENOTYPE_INVENTORY.md` `2b2bcbd9…` | hashed in the freeze; only VGT primary is registered |
| 2 | Existing verifier | complete 12:50:03→12:51:40Z | `npm run pools -- verify` | `results/logs/pools-verify.log` (local) | all passed |
| 2b | Standalone CLI parity | complete 12:53Z | `npm run app -- allIn-trailingBuy-postExitContinuation VGT all - - - <scratch> --phenotype primary` | `results/parity/cli-vgt-primary-all-trades.csv` `8c96eafe…` | $178,574.30, 21 trades |
| 3 | Baseline | first 13:00Z (47/47); final rerun 13:28Z (49/49) | `npm run vgt-robustness -- baseline` | `results/baseline/baseline.json` `f53dfcd0…`; `results/runs/s-base.jsonl` `ec799a1e…` (unchanged by reruns) | idempotent: a rerun checks the stored s-base records instead of appending |
| 4 | Protocol freeze | complete 13:02:32Z | — | `PROTOCOL.md`, `PROTOCOL_FREEZE.json` | before any new robustness run |
| 5 | Batch | complete 13:02:55→13:05:00Z (105 s, 8 workers) | `npm run vgt-robustness -- run --workers 8` | `results/runs/*.jsonl` | 623 stored; `status` n/n |
| 5a | Amendment A1 | 13:11:51Z | — | PROTOCOL §13; freeze `amendments` | after the first `analyze`: b6 rationale; no rule changed |
| 6 | Analysis | final 13:40Z (30 s) | `npm run vgt-robustness -- analyze` | `results/analysis.json` `f2a556f1…` (contains a timestamp) + deterministic CSVs | 130/130 p-path = prior records; 4 base portfolio re-runs = stored |
| 7 | Reports | final 13:41Z | `npm run vgt-robustness -- report` | 6 rendered `.md` from `templates/` | no placeholder missing |
| 8 | Manifest | 13:41Z | `npm run vgt-robustness -- manifest` | `MANIFEST.json` `6527b26c…` | 29 record files |
| 9 | Verify | 13:42Z | `npm run vgt-robustness -- verify` | `results/logs/cmd-verify.log` (local) | 66/66 |
| 10 | Tests / types / lint | 13:42Z | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/b4-b5-robustness/tests/*.test.ts' 'src/pools/tests/*.test.ts' 'src/vgt-standalone-robustness/tests/*.test.ts'`; `npx tsc --noEmit -p .`; `npx eslint src/vgt-standalone-robustness` | `results/logs/tests-all.log` (local) | 69/69 (18 new), tsc 0, eslint 0 |
| 11 | Commands | 13:31Z | fixed / fixed --cost-bps 10 / portfolio / compare / fixed lowDd (refused) / app CLI / pools fixed B5 / pools compare B4 B5 / pools forward status | `results/logs/cmd-*.log` (local) | all as documented |
| 12 | Independent review | 13:29→13:38Z | subagent (read-only) | addressed in templates, tables.ts, analysis.ts | no critical findings; 6 major presentation issues fixed (below) |

**`results/runs` sha256** (final; unchanged since 13:05Z):

| File | sha256 |
|---|---|
| p-path | `c21fc8b4…` |
| s-base | `ec799a1e…` |
| s-control | `2621013d…` |
| s-cost | `d92cc4a5…` |
| s-joint | `c1f3ebeb…` |
| s-oat | `f8afe6bf…` |
| s-paired | `acf3b041…` |

## Constants

- Defined in `PROTOCOL.md` and `src/vgt-standalone-robustness/context.ts`; the shared ones are imported from
  `src/b4-b5-robustness/context.ts`.
- **Matched designs:** the prior labels (`'book', <pool>, 'VGT', 1`).
- **Joint design:** `deriveSeed('b4-b5-robustness-audit-v1', 'vgt-standalone-joint', 'VGT-primary', s)`, s = 1, 2;
  N = 64.
- **Bootstrap:** `deriveSeed('vgt-standalone-vs-pooled-robustness-v1', 'bootstrap')`, block 21, 5,000 resamples.

## Disclosures

- **Amendment A1.** §11's claim that lot-path items are undiluted was wrong for b6. The rule is unchanged. Added: a
  b6-free sensitivity (verdict unchanged), supplementary VGT-only and entry-session path diagnostics, and a seed-2
  sensitivity of the overall rule. All of these are post hoc and enter no rule.
- **Post-review code fixes** (no stored run affected; the verdicts are unchanged):
  - trough dates now use the New York calendar date (no observed trough moved);
  - the (c) accounting condition is derived from the baseline and re-execution records instead of hard-coded true;
  - the worst year excludes untradeable 2016 and inactive years;
  - the flag table labels its designs;
  - the baseline became idempotent;
  - the lint warnings were fixed.
- **Post-review wording fixes:**
  - the C0-increment minimum is scoped to the cost scenarios, with the neighbourhood minima added;
  - the "for S" contrary evidence is qualified with b8 and with S's own-parameter dependence;
  - B5's drawdown fragility is restated as "all 40 together, not any one book";
  - the b5 dilution caveat and a post hoc less-diluted tally were added;
  - the A1 labels were added;
  - the bootstrap wording, the shadow-identity scope (fixed lots, not portfolio sizes) and the "steadier footprint"
    claim were corrected.
- **Baseline check count.** The baseline had 47 checks at freeze time (as PROTOCOL.md and the inventory state); the
  idempotent rerun has 49.

## Guards

- **Do not rerun:** `run`, the protocol freeze, or the prior audit's write commands. Never edit `PROTOCOL.md`; a change
  is an amendment in §13 plus a freeze entry.
- **Never write diagnostic variants to `config/`.** Never edit the prospective freeze or its bound files.
- **Safe to rerun:** `analyze`, `report`, `manifest`, `verify`, `baseline` and the tests. They are deterministic,
  apart from timestamps in `analysis.json`, `baseline.json` and `MANIFEST.json`.
