# Priority 6 — Strategy Lab pooled-candidate viewing: delivery report

- **Date:** 2026-11-11.
- **Brief:** [`../../brief/2026-11-11-pooled-candidate-viewing-brief.md`](../../brief/2026-11-11-pooled-candidate-viewing-brief.md),
  verbatim (sha256 `2e32830e…9a06`).
- **Branch:** `feature/strategy-lab-pooled-candidates`, from `60eb7690` (the completed lifecycle study, which contains
  Strategy Lab).
- **Documentation:** [`../../POOLED_CANDIDATES.md`](../../POOLED_CANDIDATES.md).
- **Machine-readable parity record:** [`parity.json`](parity.json).
- **Format:** written analysis and tables only. The application charts the brief explicitly requested are part of
  Strategy Lab and are outside the research no-visuals rule; this report carries no images.

## 1. What was implemented, and where the five candidates are selected

- **Where.** A **Portfolios** tab in Strategy Lab's header (`#/portfolios`) lists the five candidates in the brief's
  order. One click loads the **complete portfolio** of a candidate: ONE replay of the research engine with one shared
  $100,000 pool on 2016-01-04 → 2026-10-30.
- **Frozen catalog.** `apps/strategy-lab/catalog/pooled-candidates.json` is built from the authoritative research
  records by `scripts/build-candidate-catalog.ts` (`runner/portfolio-catalog.ts`).
  - Every identity is recomputed with the engine's own hash functions (Growth `configId`, Priority 3 `quadId`, 5B
    `cfgId`, Priority 2 `jointId`).
  - The VG #2 books and the standalone D1 primary are checked against their configs. Any disagreement fails the build.
  - The test requires the committed file to equal the rebuilt one byte for byte.
- **Thin bridge** (`runner/portfolio-bridge.ts`). It converts the engine's funded lots, funding log and minute marks into
  Strategy Lab's contract events, a positions ledger, a per-session equity and drawdown series and portfolio metrics, and
  reconciles every aggregate with the engine.
  - The engine is 5B's `runLife(…, 'L0')`, which is Priority 3's `run`, followed by `recordOf`. It is unchanged; the
    bridge implements no trading rule.
- **Server.**
  - `runner/portfolio-run.ts` runs as an allowlisted child process.
  - `server/portfolios.ts` provides the catalog routes, the replay identity, a separate namespaced cache
    (`<state>/portfolio-cache/`), and one replay at a time with coalescing and tickets. No run, variation or database
    row is written.
- **UI** (`src/components/PortfolioView.tsx`, `src/chart/EquityChart.tsx`, `src/portfolio.ts`):
  - the selector;
  - the read-only frozen-preset header with expandable settings, conventions, provenance and parity;
  - the portfolio summary and booked attribution;
  - the portfolio equity and minute-drawdown panels;
  - VGT/GDX tabs on Strategy Lab's price chart (candles or intraday line, zoom, pan, measure) with component frames:
    D1 square, Growth round;
  - show/hide toggles, with refused signals OFF by default;
  - the expandable positions ledger with filters and jump-to-chart.
- **Backward-compatible extensions:** marker frames (`chart/markers.ts`, `PriceChart.tsx`, `Panels.tsx` Glyph), a
  tooltip body hook (`Events.tsx`), the open-position mark of a replay (`trades.ts`) and `PR-` routing (`api.ts`). Every
  existing view renders as before.

## 2. Working URL, launch command, branch and commit

| What | Value |
|---|---|
| From any tailnet machine | **http://apollo:4317/#/portfolios** (or `http://100.68.60.114:4317/#/portfolios`; the API token is asked once, as before) |
| On apollo itself | http://127.0.0.1:4317/#/portfolios |
| Branch | `feature/strategy-lab-pooled-candidates` (pushed; not merged into `main`) |
| Running task instance | transient user unit `strategy-lab-p6` (started 2026-11-11T19:29:43Z): this branch's server on port 4317, loopback + Tailscale, the usual live state `state/strategy-lab/`, `dist/` = the final check's build; MemoryHigh 6 G, MemoryMax 8 G |
| Stop / status / logs | `systemctl --user stop strategy-lab-p6` · `systemctl --user status strategy-lab-p6` · `journalctl --user -u strategy-lab-p6 -f` |
| Start again later (the usual way, from this branch) | `npm --prefix apps/strategy-lab run start:vpn` (rebuilds the UI if stale) |

Port 4317 was free (no Strategy Lab process or service was running), so the task instance uses the usual port and the
usual state. No firewall or security setting was changed: the existing loopback + Tailscale binding and token apply.

## 3. Parity (2016-01-04 → 2026-10-30, one $100,000 pool, 5 bps per side, 11% simple interest, continuous run)

| Candidate | Full-history marked net | Full-history max minute DD | 2025–2026 marked net | Archived target (net / DD / 2025–2026) | Verified |
|---|---:|---:|---:|---|---|
| New L0 primary | $479,605.18 | $20,385.99 | $96,883.72 | $479,605.18 / $20,385.99 / $96,883.72 | ✓ |
| C4-refined | $452,082.36 | $19,477.66 | $91,512.65 | $452,082.36 / $19,477.66 / $91,512.65 | ✓ |
| Original C4 | $401,867.24 | $21,536.85 | $99,081.34 | $401,867.24 / $21,536.85 / $99,081.34 | ✓ |
| VGT-only: D1 primary + Growth #4 | $271,525.33 | $19,534.41 | $66,585.12 | $271,525.33 / $19,534.41 / $66,585.12 | ✓ |
| VGT-only: D1 primary + Growth 08500a60 | $252,359.65 | $19,556.63 | $60,551.20 | $252,359.65 / $19,556.63 / $60,551.20 | ✓ |

The development checks match too:

| Candidate | Net at the 2024-12-31 close | Minute DD to that close | Archived development check |
|---|---:|---:|---|
| New L0 primary | $382,721.46 | $19,459.83 | $382,721.46 / $19,459.83 |
| C4-refined | $360,569.71 | $17,280.74 | $360,569.71 / $17,280.74 |
| Original C4 | $302,785.91 | $17,332.09 | $302,785.91 / $17,332.09 |
| VGT-only + #4 | $204,940.21 | $19,534.41 | $204,940.21 / $19,534.41 (Priority 2) |
| VGT-only + 08500a60 | $191,808.45 | $19,534.41 | $191,808.45 / $19,534.41 (Priority 2) |

Beyond the headline figures, every replay matched its archive in three ways.

**43 independent checks per candidate:**
- the ten headline fields: full net, minute DD, validation net and reset DD, development net and DD, realized,
  unrealized, lot count, funded-lot ledger signature;
- every other field of the archived compact record (`recordOf`): wins and losses, interest, costs, per-book and
  per-family statistics, years, periods, episodes, the books' standalone figures and more.

**The archived ledgers, event for event:**

| Candidate | Archived ledgers compared | Scope |
|---|---|---|
| Original C4 | Priority 3 validation ledger 18 (49 lots, 84 funding decisions, 2,723 daily marks); 5B development ledger (38 lots) | Whole run; 2016–2024 |
| VGT-only + #4 | Priority 3 ledger 16 and Priority 2 ledger 14 (28 lots, 34 decisions, 2,723 marks each) | Whole run |
| VGT-only + 08500a60 | Priority 3 ledger 17 and Priority 2 ledger 11 (26 lots, 30 decisions, 2,723 marks each) | Whole run |
| New L0 primary | 5B development ledger (34 lots entered by 2024-12-31) + the whole-run ledger signature | 2016–2024; whole run |
| C4-refined | 5B development ledger (41 lots) + the whole-run ledger signature | 2016–2024; whole run |

Every lot's entry time, raw and after-cost price, principal and shares matched. So did each fill (time,
partial/final, reason, raw price, shares, repaid principal, net), the interest, costs, realized, unrealized and net, the
MAE and the status. Every refusal (book, time, price, occupant) and every daily mark matched as well.

**One explained convention difference.** Priority 3's CSV writes "open (marked at the last close)" in the exit-reason
column of an open lot. The ledger comparator maps that label to "no exit". No money, time or count differed.

**The 2025–2026 figures** are the marked-net change from the 2024-12-31 close in the one continuous run. Positions and
state carry across the boundary; no fresh account is started. Each figure is rounded and matched on its own.

**Counts:**

| Candidate | Positions (open) | Partial exits | Refused (slot occupied) | Granted orders unfilled at the end |
|---|---|---:|---:|---:|
| New L0 primary | 46 (1) | 0 | 33 | 0 |
| C4-refined | 53 (1) | 0 | 37 | 0 |
| Original C4 | 49 (1) | 0 | 35 | 0 |
| VGT-only + #4 | 28 (0) | 0 | 6 | 0 |
| VGT-only + 08500a60 | 26 (1) | 3 | 4 | 0 |

## 4. Executed events, refusals and shadow trades

- **Every drawn entry, partial exit and final exit is an actual funded execution** of the pool: a fill of a funded lot,
  from the engine's lot ledger.
- **Partial exits** occur only in the 08500a60 combination; the other four Growth books have retention OFF:
  - P-1: partial on 2018-02-06, final on 2018-10-12;
  - P-21: partial on 2024-04-19, final on 2024-08-06;
  - P-26: partial on 2026-06-09, then open at the endpoint. The remainder of 66.6787 sh and $50,000 principal is marked
    at $9,376.22, and the whole position nets $19,649.76. No closing fill is invented.
  - The remainder keeps the slot until its final exit, and the next position starts only afterwards (tested).
- **Refused signals** are executable decisions the pool refused because its slot was held. They show the component, the
  occupant and the decision price, as purple ⊘ markers that are **OFF by default**. They are never fills, positions, P&L
  or ledger rows. Growth's own filter blocks are not refusals and are not shown.
- **Shadow (virtual) trades are absent** from the chart, tooltips, ledger and counts. They stay inside the engine, as
  L0 requires.
- A **granted order still unfilled at the endpoint** would be listed as reserved and never drawn as an entry (tested on a
  synthetic case; none of the five has one). 5B's L2 end-of-window fix (A1) is L1/L2-only and is not on this path; L1/L2
  are not offered.

## 5. Acceptance

| Requirement (brief) | Expected | Actual | Pass | Evidence |
|---|---|---|---|---|
| Catalog completeness and exact identities | 5 candidates, brief order, exact IDs; no mixing of the D1 primary, VG #2's pair and L0's modified books | Rebuilt from records, byte-identical; identities recomputed; the three D1 kinds checked distinct; C4-refined's 17 changed settings | ✓ | `tests/portfolio-catalog.test.ts` (8) |
| Full-history net, minute DD, 2025–2026 net | 5 × 3 figures to the cent | All equal | ✓ | `tests/portfolio-parity.test.ts`; `parity.json` |
| Development checks | L0 / C4-refined / C4 dev figures | All equal (VGT-only ones too) | ✓ | idem |
| Exact funded event chronology, open balances | Ledger-level equality | All lots, fills, decisions and daily marks equal; record signature equal | ✓ | idem (`compareLedgers`) |
| 08500a60 partial and final exits | Actual ledger | P-1, P-21 (partial + final), P-26 (partial + open remainder) | ✓ | parity test; `e2e/portfolios.spec.ts` |
| Synthetic edge cases | Remaining quantity, finance allocation, counts; pending orders | Partial/final, open, refused, pending, carry-in, reconciliation failures | ✓ | `tests/portfolio-bridge.test.ts` (7) |
| Refused hidden by default; never fills; unfilled orders never fills | — | OFF by default (UI and model); shown only on request; count unchanged in ledger and summary | ✓ | `tests/portfolio-model.test.ts`, e2e |
| Toggles leave aggregates unchanged; validation viewport keeps carry-in; rapid switching shows no stale figures | — | Summary identical under every toggle and filter; the validation viewport changes only the window; switching shows the selected candidate's figures | ✓ | model test, e2e |
| No duplicate saved runs; namespaced cache keyed by vector, lifecycle, window, data and implementation | — | No run created; cache hit after a replay; tampered entry evicted; queued replay released | ✓ | `tests/portfolio-server.test.ts` (4), e2e |
| Existing runs, saved data and Interactive Preview still work | Existing suites pass | Final check: Vitest 314/314, Playwright 81/81 (existing preview, candles, markers, trades, phenotypes, delete specs); live audit identical; live saved run R-000042 opens | ✓ | §6, §7 |
| Browser end to end | Every candidate loaded; VGT and GDX tabs; entry, partial and final ↔ ledger; filters; refused default; zoom; daily and intraday; reload persistence | All exercised in Chrome | ✓ | `e2e/portfolios.spec.ts` (7) |

## 6. Tests performed

| Check | Result | Notes |
|---|---|---|
| New Vitest suites | 33 tests pass | catalog 8, bridge 7 (synthetic edge cases), model 5, parity 9 (real data, about 6 s), server 4 (real replays, about 21 s) |
| New browser spec `e2e/portfolios.spec.ts` | 7/7 | Every candidate from the selector; VGT and GDX tabs; D1/Growth frames; 08500a60 P-1 entry → partial → final and P-26's open remainder against the ledger; refused OFF by default then shown; toggles and filters with unchanged figures; jump to a GDX row; candles, intraday line, 1M zoom, validation viewport; rapid switching; reload from cache; Runs view |
| **Final app check** `npm run check` (check-2, 2026-11-11T19:22:50Z → 19:29:20Z) | **all green** | Typecheck (client, server, e2e), ESLint, **Vitest 314/314** (34 files: 281 existing + 33 new), production build, **Playwright 81/81** (74 existing + 7 new) |
| Earlier full runs | e2e-full-1: 80/81; check-1: 80/81 | Each failure was a different existing test, both timing races, and neither touches changed code. `strategy-lab.spec.ts:311` read `data-view-from` = null during a chart remount (the documented flaky test; 3/3 on rerun). `candles.spec.ts:439` measured the plot width before the resize redraw, while I was running the parity script concurrently; it passed fresh, and its `--repeat-each` failures received the correct `cache-hit` state. Both passed in check-2. |
| Root `tsc --noEmit` | clean | |
| Root ESLint | 793 problems (5 errors) | **= the base commit `60eb7690` exactly** (rerun on an archive of it); this task changes no root-linted file (`apps/**` is ignored at the root) |
| Root `npm test` (memory-capped unit, 19:06:53Z → 19:11:00Z) | 1,424 tests: 1,413 pass, 4 skipped, **7 fail = the known pre-existing set** | Six `src/app/allin-original.ts` case-sensitivity failures and the Study 7 data-end parity; no `src/` file changed |
| Catalog check | identical | `npm --prefix apps/strategy-lab run portfolio-catalog -- --check` |
| Live task instance in Chrome over Tailscale | all five verified | Cold replays about 6 s each; saved run R-000042 and the Phenotypes view load; no console errors |

## 7. Data preservation

- **Live state** `state/strategy-lab/`:
  - **The logical audit is identical before and after** (`audit:state`). That covers counts, 28 runs and 41 variations
    with their immutable hashes, titles, bookmarks (11 runs, 1 variation), notes, migrations, triggers, foreign keys,
    integrity and the 28 artifacts' events.
  - All 190 non-database files (`runs/`, `imports/`, `api-token`, `trash/`) are **byte-identical** to the task's start
    baseline.
  - The database file is unmodified (dated 2026-11-07). My read-only audit at 19:04:12Z created an empty (0-byte)
    `strategy-lab.sqlite-wal` side file, which SQLite makes even for read-only opens.
  - The only addition is the new disposable replay cache `portfolio-cache/` (5 replays, 2.0 MB).
  - No migration was needed and none was applied. No saved run, variation, note or bookmark was created or changed.
- **Market data:** VGT `2ee06310…`, GDX `77dba9b2…` are unchanged.
- **Research records:** no file under `research/` changed. Every frozen study, hash, selection and verdict is untouched;
  the catalog only reads them.
- **Tests and scratch:** every test, e2e run and scratch server used temporary state directories.

## 8. Limitations and disclosures

- **Fixed window.** The replay window is the archived benchmark only (no simulation-window control); the period buttons
  are viewports.
- **Pinned data.** A change to the canonical VGT or GDX file makes replays fail closed until the engine's data pins are
  deliberately updated.
- **Read-only presets.** There is no editing of a loaded preset, and so no custom derivative. Custom single-strategy work
  stays in New Test and Interactive Preview.
- **Session-only preferences.** Show/hide choices, ledger filters and the chart type are page state and reset on reload.
  The address keeps the candidate and the tab.
- **Rapid-switching test.** The e2e rapid-switching test runs against cached replays, because an earlier test replays
  all five. The stale-response guard is a code-level check (candidate id and replay id) exercised there and in normal
  use; it is not separately tested against slow cold replays.
- **Test edits.** No existing test was changed. The new e2e spec waits for the incoming symbol's markers after a tab
  switch, to avoid the known outgoing-chart race of `strategy-lab.spec.ts`.
- **Report wording.** A research report is not the place for the application's charts. This report uses tables only,
  and verification screenshots were kept outside the repository.
- **Read-only audit side files.** The read-only `audit:state` open of the live database created an empty
  `strategy-lab.sqlite-wal` (§7); no data changed.
- **Task instance on the usual port and state.** The verified task instance runs on the usual port 4317 against the
  usual live state. Port 4317 was free and no service was replaced. It is reported here rather than switched silently;
  stop it with `systemctl --user stop strategy-lab-p6`.
