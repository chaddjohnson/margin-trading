# Strategy Lab — pooled portfolio candidates

**Priority 6** (brief: [`brief/2026-11-11-pooled-candidate-viewing-brief.md`](brief/2026-11-11-pooled-candidate-viewing-brief.md)).
The **Portfolios** tab lets you pick one of five frozen D1 + Growth portfolio candidates and inspect its **actual funded
trades**, D1 and Growth together, on VGT and GDX. Each candidate is ONE replay of the research engine with one shared
$100,000 pool, the same replay the research studies ran.

This is an inspection tool, not an optimizer. It does no search, retuning, substitution or deployment. Inclusion in the
catalog is permission to inspect a candidate, not a trading instruction or a new favourite. The list follows the brief's
order, which is not a safety ranking.

## 1. Using it

1. Open **Portfolios** in the header (`#/portfolios`). The selector lists the five candidates and their components; a
   switched-off component is a dashed **OFF** chip.
2. Click a candidate (`#/portfolio/<id>?symbol=VGT`):
   - A cached replay appears at once (about 0.1 s).
   - Otherwise the server replays it in about 6 s. The header shows *Replaying …* with the runner's progress, and no
     earlier figure is shown meanwhile.
   - A failed replay says so and shows no figures (**Try again**).
3. The header carries:
   - the readable composition and how the candidate differs from its relatives;
   - the badges *FROZEN PRESET · READ-ONLY* and *L0 lifecycle · one $100,000 pool · no compounding*;
   - the parity badge, *Parity verified: 43/43 archived checks* (§6).

   **Settings, conventions, provenance and parity** expands:
   - every component's exact vector: the D1 grid with its units, or the Growth effective parameters;
   - the engine's own parameter form, with inactive values listed;
   - the portfolio conventions;
   - identities and source files with sha256;
   - the parity table, replay id, implementation and data hashes.
4. **Portfolio totals** are always the ONE pool's figures; see §4.
5. **Portfolio equity and minute drawdown**:
   - the marked net at each NYSE close;
   - beneath it, each session's deepest drawdown from the running **minute** peak. Its lowest point is the run's maximum
     minute drawdown.
   - The validation period is shaded.
6. **Symbol tabs.** VG candidates have VGT and GDX tabs; the VGT-only candidates have VGT. A tab shows that symbol's price
   and every component trading it: on VGT, D1 and Growth together. Switching tabs changes only the view.
7. **Chart.**
   - It is Strategy Lab's price chart: Candles · 1D or Line · intraday, wheel zoom, ⌘/Ctrl/Shift-drag pan,
     drag-to-measure, range selector and zoom buttons.
   - **Period** buttons (*Full run 2016–2026*, *2016–2024*, *2025–2026 (validation)*) are viewports of the one continuous
     run; they are not new simulations.
   - Show/hide toggles (§3) change only what is drawn.
8. **Positions** ledger:
   - one row per funded position, with ▸ to expand its executions;
   - filters by symbol, component, status and period;
   - **Chart** / **Show** selects the event on the chart. It switches the tab if needed and zooms to about three months
     from a wide view.
   - A filtered list shows an explicitly labelled *filtered subtotal*. The unfiltered list states that Σ booked net = the
     portfolio's marked net.
9. **Persistence.** The address keeps the candidate and the tab, so a reload or a link shows the same replay again from
   the validated cache. The show/hide choices and ledger filters are page state: a reload resets them, and refused signals
   are OFF again.

## 2. The five candidates (catalog `apps/strategy-lab/catalog/pooled-candidates.json`)

| # | Name (catalog id) | Composition | Identities | Settings source |
|---|---|---|---|---|
| 1 | **New L0 primary** (`l0-primary`) | Modified D1·VGT [237,9,73,15,72,42,103,41] + modified D1·GDX [277,1,61,13,232,25,152,10] + VGT Growth `6b5f909b30cfa516`; GDX Growth OFF; L0 | 5B cfg `67cfdd9b62d1e16f`, Priority 3 quad `a2e385640ca61012` | 5B `FROZEN_SELECTION.json` `crossTestSubjects[R01]` (= `arms.L0.primary`, `C24/L0/informed/R1#1 profit`) |
| 2 | **C4-refined** (`c4-refined`) | VG #2 Balanced's unchanged D1·VGT `d1-bd80e32ee4` + D1·GDX `d1-7b99d2833d` + refined VGT Growth `c3c1c0d56c4ee3b0`; GDX Growth OFF | 3B `C24/informed-fixed#1 profit`, cfg `0f017f0ab9b26f24`, quad `07443ffaeef41e85` | 5B `crossTestSubjects[R21]` (control C4R); checked against 3B's finalSet and 3C's `c4Refined` |
| 3 | **Original C4** (`c4`) | VG #2 Balanced's D1 pair + VGT Growth #4 `420cd989e4fa7749`; GDX Growth OFF | quad `f324035d15f69610` (5B cfg `2f49a1cc226b4ece`) | 5B `crossTestSubjects[R20]` (control C4) |
| 4 | **VGT-only: D1 primary + Growth #4** (`vgt-d1-g4`) | Standalone VGT D1 primary `d1-ebc9f639b3` [216,3,73,8,74,29,90,60] + Growth #4; architecture A, D1 first; no GDX | Priority 2 joint `04741779be90e639`, P3 quad `dbe7be81867b739a` | Priority 2 `FROZEN_SELECTION.json` control; Priority 3 `CONTROL_MANIFEST.json` `p2:primary+g4` |
| 5 | **VGT-only: D1 primary + Growth 08500a60** (`vgt-d1-g085`) | The same D1 primary + Growth `08500a60ec56cfae` (50% sale at the first trailing-stop event; the remainder exits on one close below its 160-session SMA, or its initial stop) | Priority 2 joint `a8833010dd6f9c30`, P3 quad `51da785f9a3b5f26` | Priority 2 control; Priority 3 `p2:primary+g085` |

Distinctions the catalog enforces:
- **VG #2 Balanced** is Study 8 `S8-VG-F24-3` (`s8-vg-balanced`), not Study 7's pool.
- C4-refined's Growth changes **17 settings** of #4, the initial stop OFF among them. Five more become inactive as a
  result.
- The L0 primary's D1 books are not VG #2's.
- The VGT D1 primary is neither VG #2's VGT book nor the optimized D1-only winner.

## 3. Replay semantics

- **Engine.** `src/vg-lifecycle-matched-optimization/life.ts` `runLife(door, quad, options, 'L0')`. Under L0 this is
  Priority 3's `src/vg-d1-growth-joint/evaluate.ts` `run`: the canonical virtual books and the unchanged pooled replay
  `pool.ts` `runPool`. The compact record comes from `recordOf`.
  - The VGT-only candidates run on the same engine with D1·GDX and Growth·GDX disabled (placeholder vectors, never run).
    Priority 3 verified this against Priority 2's one-symbol engine: parity stage P3, plus byte-identical FULL ledgers.
  - 5B's A1 fix (`lifeBook.ts`, L1/L2 retained orders at a door's end) is not on this path, and L1/L2 are not offered.
  - The bridge `apps/strategy-lab/runner/portfolio-bridge.ts` converts the result and reconciles it. It implements no
    trading rule.
- **Door.**
  - Priority 3's FULL door, opened with `openFullDoor(…, quietLog)`: read-only and writing no door log. It is guarded by
    Priority 3's read-only frozen selection.
  - It reads the canonical `data/VGT` and `data/GDX` minute files, pinned by sha256: `2ee06310…`, `77dba9b2…`.
  - Window 2016-01-04 → 2026-10-30, forward split adjustment to 2016-01-04: VGT's 8:1 split of 2026-04-21 makes 2026 VGT
    prices about 8× the quoted ones, the same units as the chart.
- **Conventions** (from each candidate's frozen allocator record; shown under the header's *Settings*):
  - one exclusive funded $100,000 slot; no compounding, preemption or simultaneous positions;
  - same-instant decisions D1 first, then GDX before VGT;
  - a granted decision reserves the slot until its fill;
  - after a **partial exit** the remainder keeps the slot until its final exit, and the repaid principal stays idle;
  - 5 bps per side inside the fill prices, $0 commission;
  - 11% simple interest on outstanding principal, calendar days ÷ 365;
  - stops fill at the stop or the gapped open with no extra slippage; fractional shares;
  - harmonized D1 arming from 2016-01-04 (not the native VG #2 runner's 2017-06-15, which gives a different result);
  - Growth warm-up 0, signals on 1d bars;
  - lifecycle **L0**: a refused entry becomes an unfunded virtual (shadow) position and waits for its virtual exit, and
    funding never feeds back.
- **What is shown.**
  - Only funded executions: entries, partial exits and final exits of the pool's lots.
  - Shadow trades stay internal and are never drawn, listed or counted.
  - **Refused signals**: decisions the pool refused because the slot was held (*slot occupied*, the only refusal these
    candidates can have). They carry the component, the occupant and the decision price. They are OFF by default and are
    never fills, positions or P&L. Growth's own internal filter blocks are not refusals and are not shown.
  - A granted order still waiting for its fill at the endpoint would be listed under *Granted orders unfilled at the
    endpoint* and never drawn as an entry. None of the five has one.
- **Ids.** A position is `P-<funded lot number>`, unique across components and symbols. Its events are
  `SYM:P-n:entry`, `SYM:P-n:partial-k` and `SYM:P-n:exit`; a refusal is `SYM:refused:<book>:<trade>`. The chart,
  tooltips, the selected-event panel and the ledger use the same ids.

## 4. Figures and definitions

- **Marked net** = realized + the open remainder marked at the last close (shares × close − outstanding principal −
  accrued interest; the exit cost is not charged), after costs and interest.
- **Maximum minute drawdown.**
  - A strict tracker: a new peak only when strictly higher.
  - It updates at every regular-session minute where the held lot's symbol prints, and at every close, from 2016-01-04.
  - It is computed from minute marks even when the chart shows daily candles.
  - **% = ÷ the fixed $100,000 principal.**
- **2025–2026 (validation)** = the marked net at 2026-10-30 − the marked net at the 2024-12-31 close, in the ONE
  continuous run. The reset drawdown starts at that close.
  - *Carried in* lists the positions open across the boundary. Nothing is liquidated or restarted.
  - This is validation on previously examined history.
- **Development** = the marked net at the 2024-12-31 close, and the minute drawdown up to it (the causal prefix, equal to
  the D24 door's run).
- **Positions** count a partially exited position **once**. Winners and losers are closed positions by whole-position net.
- **Booked attribution** (the table under the totals) = Σ net of each component's funded positions. It is attribution,
  **not causal contribution**: removing a component would change which trades the shared slot funds. The rows sum to the
  portfolio net.
- **Fill-level vs position-level P&L.**
  - A partial or final exit's *This fill (realized)* = proceeds − repaid principal − its interest.
  - *Whole position net* = Σ its fills, or for an open position its realized fills + the marked remainder.
- **Colours.** Strategy Lab's outcome colours apply to the whole position, entry, partial and final exits alike:
  - green net profit, red net loss, grey breakeven, sky blue still open;
  - purple ⊘ refused.
  - A partial exit therefore takes its position's colour; its own fill P&L is in its tooltip.
- **Shapes** never rely on colour alone:
  - ▲ entry; ▼ final exit; a **half-filled ▼** partial exit; ⊘ refused.
  - **D1 sits in a square frame, Growth in a round frame.** The legend shows both, and the ledger and tooltips name the
    component.
  - In a dense cluster, candles fan a session's markers left → right, the tooltip lists every overlapping marker, and a
    repeated click cycles through them.

## 5. Caching, persistence and isolation

- **No saved run.** Browsing writes no run, variation, note or database row.
- **The replay cache.** Results live in their own disposable cache, `<state>/portfolio-cache/`, configured with
  `STRATEGY_LAB_PORTFOLIO_CACHE_DIR`, `_MAX_ENTRIES` (default 40) and `_MAX_MB` (default 512).
  - Each entry is keyed by the sha256 of its **identity**: the catalog entry's own sha256, the lifecycle, the benchmark
    window, the content hashes of `data/VGT`, `data/GDX` and the runtime inputs, the FULL door's guard file, and the
    implementation fingerprint (the runner's whole static import closure, the packages, Node and its flags).
  - Every request recomputes the identity. A hit requires an equal identity and every file matching its sha256 and size;
    a tampered or stale entry is evicted, never served.
  - A typical entry is about 330 KB; the browser receives only the summary, the ledger, one symbol's events and the
    chart's prices.
- **Execution.**
  - `runner/portfolio-run.ts` runs as a child process with the allowlisted Node flags and no shell, one replay at a time.
  - Identical requests coalesce. A queued replay that nobody waits for is dropped when its ticket is released (a newer
    selection, or a ticket idle for 60 s). A running one finishes and is cached.
  - The page displays a result only if it belongs to the selected candidate (candidate id and replay id checked).
- **Cost.** A cold replay takes about 6 s: 5.5 s loads both minute files, then 40–210 ms for the replay itself. The child
  peaks at about 0.9 GB RSS. A cache hit takes about 0.1 s.

## 6. Parity (verified 2026-11-11)

| Candidate | Full-history marked net | Full-history max minute DD | 2025–2026 marked net | Development net / minute DD | Positions (open) · partial exits · refusals |
|---|---:|---:|---:|---:|---|
| New L0 primary | $479,605.18 | $20,385.99 | $96,883.72 | $382,721.46 / $19,459.83 | 46 (1) · 0 · 33 |
| C4-refined | $452,082.36 | $19,477.66 | $91,512.65 | $360,569.71 / $17,280.74 | 53 (1) · 0 · 37 |
| Original C4 | $401,867.24 | $21,536.85 | $99,081.34 | $302,785.91 / $17,332.09 | 49 (1) · 0 · 35 |
| VGT-only: D1 primary + Growth #4 | $271,525.33 | $19,534.41 | $66,585.12 | $204,940.21 / $19,534.41 | 28 (0) · 0 · 6 |
| VGT-only: D1 primary + Growth 08500a60 | $252,359.65 | $19,556.63 | $60,551.20 | $191,808.45 / $19,534.41 | 26 (1) · 3 · 4 |

Every figure equals its archived target to the cent. Each replay's 43 checks compare:
- the ten headline fields: full net, minute DD, validation net and reset DD, development net and DD, realized,
  unrealized, lot count, ledger signature;
- every other field of the archived compact record.

The archived ledgers match event for event:
- **C4 and both VGT-only candidates, whole run:** Priority 3 / Priority 2 FULL ledgers. Every lot (entry, each fill's
  time, kind, reason, price, shares, repaid principal and net, interest, costs, net, status), every funding decision, and
  the 2,723 daily marks.
- **L0 primary and C4-refined:** the 5B development ledgers (every lot entered by 2024-12-31), plus the whole-run
  funded-lot signature.

The command is `node --experimental-transform-types --max-old-space-size=6144 apps/strategy-lab/scripts/portfolio-parity.ts
--out <file>` (from the repository root; read-only). The test is `tests/portfolio-parity.test.ts`. The record is
`reports/2026-11-11-pooled-candidates/parity.json`.

## 7. API and artifacts

| Route | Purpose |
|---|---|
| `GET /api/portfolios` | The catalog with every entry's full settings, and `cached` for the current identity |
| `GET /api/portfolios/:id` | One catalog entry |
| `POST /api/portfolios/:id/replay` | ONE replay of ONE candidate → a ticket `{ticket, replayId, state, cacheHit, coalesced, progress, error}` |
| `GET /api/portfolio-replays/tickets/PQ-…`, `POST …/release` | Poll a ticket, or release it (drops a queued replay nobody waits for) |
| `GET /api/portfolio-replays/PR-…[?current=1]` | The replay: metrics, positions, price source, hashes |
| `GET /api/portfolio-replays/PR-…/events?symbol=`, `/prices`, `/candles` | Same shapes as the run routes (`resultPath` maps `PR-`) |
| `GET /api/portfolio-replays/PR-…/equity` | Per session: close mark, realized, deepest minute drawdown, minute low |

- **Cache entry artifacts:**
  - `events.json` (contract v2);
  - `positions.json`;
  - `equity.json`;
  - `metrics.json` (`kind: pooled candidate replay`, with `parity`, `attribution`, `pending` and the engine `record`);
  - `provenance.json`, `request.json`, `run.log`;
  - `entry.json` (the identity and every file's sha256).
- **Health** lists the feature `pooled-candidates`.

## 8. Maintenance

- Rebuild or check the catalog from the research records, from the repository root:
  `node --experimental-transform-types apps/strategy-lab/scripts/build-candidate-catalog.ts [--check]`.
  `tests/portfolio-catalog.test.ts` requires byte equality. A changed research record fails the build, and nothing is
  edited by hand.
- **Non-finite values.**
  - Archived engine values `"__NaN"`, `"__Inf"` and `"__-Inf"` are decoded with the repository's codec. An engine NaN
    means inactive.
  - The executable vectors (`quad`, `enabled`) hold only finite numbers, booleans and strings, so an OFF rule cannot be
    activated by import.
  - Display copies write an inactive value as null and list it under `inactive`.

## 9. Limitations

- **Fixed window.** Every candidate runs on the archived benchmark window only; there is no separate simulation-window
  control. The period buttons are viewports.
- **Pinned data.** If the canonical VGT or GDX file changes, the FULL door refuses: the replay fails closed, with a
  message, until the pins are deliberately updated.
- **Read-only presets.** There is no parameter editor and no custom derivative. Use New Test or Interactive Preview for
  custom single-strategy runs.
- **No export bundle.** Replays have no research-bundle export.
- **Session-only preferences.** Show/hide preferences, filters and the chart type are not saved across reloads. The
  address keeps the candidate and the tab.
- **Dense markers.** At full zoom the markers of busy years overlap. Zoom in, use the tooltip's overlap list, or use the
  ledger's **Chart** button.
