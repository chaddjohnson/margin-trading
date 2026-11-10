# RESEARCH RECOVERY — Priority 3C: fixed-anchor GDX Growth partner search (C4-refined, C4, VGT #4)

## Top screen

- **Updated:** 2026-11-10T15:48Z (UTC). **Status: INCOMPLETE — CHAIN DONE (15:47:39Z); committing the development records and FROZEN_SELECTION.json, then the one-time validation.**
- **Authority:** `PROTOCOL.md` sha256 `1307e46a2f1b1b212d0dd7e9a85133130f0ec9208c1fc86d344c41884c1fbcf1`, FROZEN by
  `results/protocol-freeze.json` `5c40244e3422304327f5eb99d403490920caeb93e597c43ab0f4086679c8a275` (2026-11-10T13:23:18Z;
  closure 254 files, digest `cf9286bf1355…`; evaluation digest `f579f23ce3bc…`); `AMENDMENTS.md` R1–R3 (pre-freeze)
  `1ca1ef08…dedca`; adoption 2.0.0 (preflight PASS 13:23Z). Commits: `e66fe6b7` (pre-freeze), `f2cd47a9` (freeze).
  Brief `c98a3e42…5b4d`.
- **Sealed before the freeze:** `CONTROL_MANIFEST.json` `0c81f3f0…bf3f`; `results/audit/archive-audit.json`
  `0a7a3c44…00b2` (5 exact-anchor matches, identical fresh re-evaluations, 0 new seeds); `results/parity/parity.json`
  `696cac8c1aae9db36dd08ac98c2af45e5330488c0ea4c3b1392a793174f19895` (146 checks, 0 failed; E3 reproduces 3B's C4 and
  C4-refined confirmation statistics exactly).
- **Ran:** unit `c4gdx-chain` (bash `chains/study.sh`, outside the slice; log `results/logs/study-chain.log`),
  2026-11-10T13:23:25Z → 15:47:39Z (CHAIN DONE; nothing running now). It runs, one unit at a time inside `c4gdx.slice`: C19 search → qualify → commit selection →
  fold-eval → C21 … → C23 … → sequential → C24 search → C24 qualify → transfers → diagnostics → freeze-selection. Each
  step's log is `results/logs/<unit>.log`; progress `.cache/c4-gdx-growth-partner/jobs/<job>/progress.json`.
  Check: `systemctl --user list-units 'c4gdx*'`; `tail results/logs/study-chain.log`.
- **If the chain stopped:** read its log; an interrupted step (exit 75 or a killed unit) resumes by rerunning the chain
  unit with the same command (`RUN_COMMANDS.md`): sealed steps are skipped, the interrupted step resumes from its archive.
  A failure (exit 1) needs diagnosis first; never rerun a sealed step.
- **Next (by hand, after CHAIN DONE):** commit `FROZEN_SELECTION.json` (+ seals) → `validate` (FULL, once) → commit →
  tables → `REPORT.md` → roadmap → full `npm test` (contained, PATH) → commit and push.

## Stage log (sealed records; verify with `npm run c4gdx -- verify`)

| Stage | Record | sha256 | Wall | Fresh evaluations |
|---|---|---|---:|---:|
| C19 search | `results/search/C19/search.json` | `95b023147fb9a40f29ff4757d67c47307492db3aaefa4699586437a59ddfa943` | 16.6 min (13:23:26Z → 13:40:01Z) | 334,454 (+1,632 hits); peak 7.3 GiB; lanes stop: 8 "triggers not met", G/seeded "extension cap reached" |
| C19 qualify | `results/folds/C19/selection.json` | `78703f891b14588015bc75a48d797dfc419c8ed52d9dabda370b15c9406fc1b4` (committed `bf2ac4df`) | ≈ 3.5 min | primaries R `C19/R/seeded#4 profit order`, O `C19/O/seeded#1 profit`, G `C19/G/seeded#3 balanced`; partner candidate R only |
| C19 fold evaluation | `results/folds/C19/evaluation.json` (slice 2020–2021, D21) | `49963f69b7642862655dfebd0b5903211d667618dbda8a604a21ed4e1cef2b0e` | 4 s | in-process |
| C21 search | `results/search/C21/search.json` | `20353ac4c011e3f10cee4a8f959ca5e3d96691675a7a396dc2a9bd512643f828` | 19.9 min (13:44:04Z → 14:03:58Z) | 267,991; 9/9 lanes "triggers not met" |
| C21 qualify | `results/folds/C21/selection.json` | `bcefe4f5dc71ed4dbd93859beff74b358d38d328dcec0fd8ef83f9efc178ec7e` (committed `0e738299`) | ≈ 5.5 min | primaries R/O/G `broad-rise#1 profit`; no partner candidate |
| C21 fold evaluation | `results/folds/C21/evaluation.json` (slice 2022–2023, D23) | `f346d1354ae4b8e7c14b22ad243898c0a7c8a3eb454e16b4d738769d91e547a3` | 4 s | in-process |
| C23 search | `results/search/C23/search.json` | `1ad1985ac66544d282fb0bc817255bcd8652df92d3330f8a8aecf69789476177` | 32.5 min (14:09:56Z → 14:42:28Z) | 330,667 |
| C23 qualify | `results/folds/C23/selection.json` | `dedf06116e7782fcc69c3ed937676fc414c48ed16bdc4c31583696e3338ecd5d` (committed `37c70094`) | ≈ 8 min | primaries R/O `broad-rise#1 profit`, G `broad-rise#3 profit order`; no partner candidate |
| C23 fold evaluation | `results/folds/C23/evaluation.json` (slice 2024, D24) | `5dd4379454c97b505f1983c9d80f4d72ebbd529bc03d86806ddb97abaae321c9` | s | in-process |
| Sequential (descriptive) | `results/folds/sequential.json` | `30242e52cf6cc7f7a42d7118edae5c3d7a99c2c4c070fcde47ecf8f825d093ee` | 1 s | the fold primaries trail the GDX-OFF baseline in every arm over 2020–2024: R −$22,434.65 (DD $22,400.60 vs $17,280.74), O −$108,057.54 (DD $45,937.90 > $35,000), G −$5,355.27 |
| C24 search | `results/search/C24/search.json` | `35d4f70e8aa5c9e4e85bbb9106838766a9b183a0bd57e3948eb5ab8c0f32d2be` | 39.2 min (14:50:26Z → 15:29:40Z) | 347,556 (+2,335 hits); peak 10.3 GiB |
| C24 qualify | `results/folds/C24/selection.json` | `e3167d6e642d397dffc8926ea119691f06550a3e0e750c9216bd00ffc488106e` | 11.1 min (→ 15:40:45Z) | primaries R `C24/R/broad-rise#1 profit`, O `C24/O/seeded#1 profit`, G `C24/G/broad-rise#1 profit`; partner candidate G only (`C24/G/broad-breakout#3 balanced`) |
| Transfers (report-only) | `results/transfers/transfers.json` | `1562d18412a1e792b2fe596d95f8d1ffa6955c327a81210c0319fc37153f0d64` | 6.8 min (→ 15:47:30Z) | 38,978 |
| Diagnostics (D24) | `results/diagnostics/D24/diagnostics.json` | `7b359e1ad7f8eead3a3858dc2404f8dd61e323eb5fcbb5814cbc25839f386790` | 8 s | in-process |
| Frozen selection | `FROZEN_SELECTION.json` | `ef1da770c0f15d8c81f4d7fe24cd7886d729b4f6c597e6ea75ae65247820031e` | — | sealed 15:47:39Z; committed before the validation |

## Environment

- Repository root `/home/chad/projects/margin-trading`, branch `research/c4-gdx-growth-partner` from `84ae46b3`; nothing
  committed yet on the branch. Node v24.21.0; host 8 cores / 16 threads, 59 GiB.
- Code `src/c4-gdx-growth-partner/` (`npm run c4gdx -- <command>`), tests `tests/space.test.ts` (9 pass), tables
  `tools/c4-gdx-growth-partner/tables.ts`. Reuses Priority 3's engine unchanged, 5A's subject loader, 3A's observer and
  tail statistics, 3B's configuration (its instrument for E3 and the report-only "archived instrument").
- Canonical data verified 2026-11-10 (`npm run c4gdx -- doors`): the Priority 3 pins, endpoint 2026-10-30.

## Bench (engineering only; `.cache/c4-gdx-growth-partner/pilot/bench/`)

- D24, 384 random GDX centres (128 per arm) with 16 whole-portfolio neighbours each (6,528 evaluations), book cache 1,024:
  12 workers 135.2/s (7.7 GiB), **14 → 135.4/s (9.0 GiB, chosen)**, 16 → 133.4/s (10.2 GiB). Plausible random centres:
  R 74/128, O 47/128, G 40/128. In-process: a GDX Growth book ≈ 35 ms, the pooled replay ≈ 6–15 ms.

## Decisions (in the draft protocol)

- Arms R (lead), O, G; base new GDX proposals per cutoff 16,384 / 4,096 / 4,096 (cap 2×); same schedule at C19, C21,
  C23, C24; seeds provenance-restricted per cutoff (Appendix A only at C24); scopes whole-portfolio and GDX-only;
  gates Q1–Q7; per-arm actual-profit primary; partner candidate and prudent recommendation; transfers at C24.
- Departure D1 (no independent lane; descriptive fixed-anchor repeats) cites the brief's own wording.

## Do not rerun / guards

- Never modify a completed study's code or records. Pilot jobs carry `--pilot NAME` (job names `pilot-NAME-…`).
- The control manifest and the archive audit are sealed: never rerun them.
