# Baseline reproduction manifest — the frozen New L0 primary: VGT + GDX

Exact reproduction of the frozen New L0 under its original engine, and under the new controlled runner with every
control at its legacy default. Sealed evidence: `results/gates/g1-g3-new-l0.json` (sha256
`b05b5c784fb1e82f20a48da127f09bc8d8df29c8f2bac4191494e6c840699179`); the full trade list is
[`tables/new-l0-full-trades.md`](tables/new-l0-full-trades.md).

## 1. What New L0 is (confirmed on load, `tools/vg-l0-risk-controls-foundation/common.ts` `newL0()`)

| Item | Value |
|---|---|
| Source | 5B `research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json` (sha256 `cd223a0d18c44925af7102b98efae1e369899664b8fb07ee2f8a579816255793`) `crossTestSubjects[R01]` = `arms.L0.primary`, label `C24/L0/informed/R1#1 profit` |
| Identities (checked) | 5B cfg `67cfdd9b62d1e16f`; Priority 3 quad `a2e385640ca61012`; Growth·VGT `6b5f909b30cfa516` |
| Active books | **D1·VGT**, **D1·GDX**, **Growth·VGT**; options `{ enabled: { 'G:GDX': false } }`. Growth·GDX is not active (placeholder `1af5b55987a56e2f`, never run or funded). |
| D1·VGT (grid) | X 237, Y 9, stop 73, **hold 15 calendar days**, L 72, buffer 42, P 103, W 41 (tenths of a point / days / sessions); deep entry, post-exit continuation ON, net-profit stop policy |
| D1·GDX (grid) | X 277, Y 1, stop 61, **hold 13 calendar days**, L 232, buffer 25, P 152, W 10 |
| Growth·VGT | Growth 1.4.0, Rise from recent low 5.6% / 84 bars; eligibility time-limited 20; Drawdown Recovery Gate (64, 11.9%, 46.2%, 5); trailing 5.7%; maximum hold 22 calendar days; initial stop ATR 16 × 1.2; continuation `classic_d1` (67, 11.5%, 3.01%) (NL0 §1.1) |
| Shadow-entry eligibility | OFF: not present in Priority 3's pool, which this runner uses |
| Allocator | Priority 3's `runPool` (`src/vg-d1-growth-joint/pool.ts`): one exclusive funded $100,000 slot, granted only at a decision's own instant when nothing is open or reserved; same-instant order D1 → GDX → VGT; no compounding, preemption or forced switches |
| Lifecycles | D1: shadow (virtual) books, a refusal never feeds back; Growth: L0 |
| Economics | 5 bps per side inside fill prices, $0 commission; 11% simple interest on outstanding principal by calendar day (365-day year), from the fill session's date; stops at the stop level or the gapped open (no extra slippage); fractional shares; harmonized D1 arming from 2016-01-04 |
| Marked net and drawdown | Realized + open lots (shares × latest price − principal − accrued interest; no exit cost). Maximum minute DD: strict tracker at every minute the held lot's symbol prints and at every session close, in dollars of the fixed $100,000 (standard §0.3) |

## 2. Code and data versions

| Item | Value |
|---|---|
| Source revision | branch `research/vg-l0-risk-controls-foundation`; base `38222fb9` (the freeze's recorded `HEAD`; the frozen files were committed in `92f37734` immediately after) |
| Priority 3 evaluation digest | `147cad7c17eff3fa50442d2cb0ffb9c22cb7ba5091a46d1e14d3351d5cff4e88` = sealed (G0) |
| 5B evaluation digest | `3f902532b651da1939f67d650d381bcf1e27ad3b76b3f2dedef95403fba23e3b` = sealed (G0) |
| Shadow-study evaluation digest | `54304b69941e0481d5d36d52c30e76e724596dadd803c6e41489a3633e8c878e` = sealed (G0) |
| Controls module (frozen) | `src/d1-risk-controls/` config `d6b8e055…`, exit `04a895b8…`, book `db32f859…`, run `1320643c…` (full hashes in `results/protocol-freeze.json`) |
| Canonical data (FULL) | `data/GDX/data.csv` `77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049`; `data/VGT/data.csv` `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e`; 2016-01-04 → 2026-10-30, 2,723 common sessions, forward split adjustment (VGT 8:1 on 2026-04-21 is continuous: 809.13 close → 812.56 open) |
| Development doors (Priority 3 pins) | D19 2019-12-31 (GDX `528786451a8fa1ab…` 27,600,084 B; VGT `a2e4c721eee98fd0…` 18,374,863 B); D21 2021-12-31 (`3f98c79b4f8d20b5…`; `681742034cde1b9d…`); D23 2023-12-29 (`a9ea93aaace8f2a7…`; `920f3a20299b3241…`); D24 2024-12-31 (`f78dbe2a1f88666b…`; `c144619f01044037…`) |
| FULL guard | 5B `checkFullGuard` (its sealed, committed `FROZEN_SELECTION.json`) and Priority 3's frozen-selection guard (`e29e35e2…`); every opening logged in `results/doors.jsonl` |

## 3. Reproduced figures (all equal to the cent and field for field)

| Window | Net | Max minute DD | Lots | Other |
|---|---:|---:|---:|---|
| **Full 2016-01-04 → 2026-10-30 (FULL)** | **$479,605.18** | **$20,385.99** (peak 2026-06-17 17:42 UTC → trough 2026-07-17 13:34 UTC) | 46 (1 open) | realized $485,169.93, unrealized −$5,564.76; 37 wins, 8 losses; interest $73,142.47; costs $4,829.17; ledger signature `7b17578108747911` |
| Development (2024-12-31 close) | $382,721.46 | $19,459.83 | 34 | = 5B's sealed C24 centre in 33 fields (signature `0cef34136977805a`) |
| Validation 2025-01-02 → 2026-10-30 (examined history) | $96,883.72 | reset $20,385.99 | 12 after the boundary | — |

Per book (FULL): D1·GDX 31 lots, $221,780.72 booked, 54 decisions (23 refused); D1·VGT 7 lots, $146,898.43, 13 (6
refused); Growth·VGT 8 lots, $110,926.02, 12 (4 refused). In all, 79 funding decisions and 33 refusals ("slot
occupied"). 547,753 recorded minute-mark changes.

Earlier doors (same engine, legacy defaults): D19 $79,970.17 / $10,633.06 / 6 lots; D21 $251,372.87 / $17,280.74 / 17;
D23 $338,611.35 / $19,459.83 / 32; D24 as development. D19 and D21 equal the walk-forward diagnostic's causal figures.

## 4. Parity evidence

| Gate | What was compared | Result |
|---|---|---|
| G1 | Priority 3's `run`/`recordOf` on FULL (boundary 2024-12-31) vs 5B's sealed `results/validation/validation.json` R01 `record` (sha256 `83931139…`) | every field equal |
| G1 | the controlled runner (legacy controls) vs Priority 3: every virtual trade of the three books (D1·GDX 54, D1·VGT 13, Growth·VGT 12), every funded lot (entry and exit instants, raw and cost-adjusted prices, exit reasons, shares, principal, interest, proceeds, net, costs, MAE/MFE), every funding decision (outcome, reason, occupant), every recorded mark change, the minute, daily and period drawdowns, the daily marks, and the compact record | identical (deep equality) |
| G2 | the D24 run's 34 funded lots vs 5B's development ledger (`results/diagnostics/ledgers/C24_L0_informed_R1#1_profit/L0/lots.csv`, committed at `3798b5d1`) | 34/34 rows equal (decision and entry times, prices, exits, reasons, nets, interest, costs) |
| G3 | the same comparison as G1 on D19, D21, D23 and D24; D24 vs 5B's sealed C24 centre (`results/folds/C24/selection.json`, `0615262b…`) | identical; 33/33 fields |
| G4 | 60 seeded random configurations (5B grids, inclusions V/G/B) × D21, D24 | 120/120 identical (5,279 funded lots) |

Compute: G1–G3 used 10 pooled simulations (19.5 s in unit `vgrcf-newl0`, peak 1.1 GB); G4 used 240 (peak RSS 1.7 GB).

## 5. Commands

```
npm run research-preflight -- --study research/vg-l0-risk-controls-foundation
research/vg-l0-risk-controls-foundation/chains/chain1.sh newl0     # G1–G3 in a contained unit (refuses: sealed)
node --experimental-transform-types --disable-warning=ExperimentalWarning \
  tools/vg-l0-risk-controls-foundation/gates.ts newl0 --dry        # unsealed copy in $RCF_SCRATCH
```

`RUN_COMMANDS.md` lists every command.
