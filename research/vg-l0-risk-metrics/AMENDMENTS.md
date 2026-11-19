# AMENDMENTS — vg-l0-risk-metrics (append-only)

Each entry: ID, UTC time, the change, why, which results existed, and its effect. Criteria are never loosened by
amendment once results they govern exist.

## A1 — 2026-11-18T06:20Z — S3 neighbourhood parity gate compares quantiles over cent-rounded DDs

- **Change.** PROTOCOL.md §8 S3's gate ("regenerated families reproduce the sealed selection p90 DD") is computed over
  cent-rounded drawdowns (`tools/vg-l0-risk-metrics/audit.ts`: `tail(col('dd').map(r2))`), the convention of the audited
  instrument (Assignment 3's statistics are taken over Priority 3's cent-rounded record DDs).
- **Why.** Two runs (N/original, F/RA1 on D24; 05:54:54Z and 05:55:31Z) stopped at the gate with 1-cent differences
  ($28,425.32 vs $28,425.33; $24,396.87 vs $24,396.88) produced by interpolating unrounded instead of rounded DDs.
- **Results that existed.** Three families sealed under the unrounded comparison (New L0, L/original, F/original — they
  also pass the rounded one); the two failed runs sealed nothing.
- **Effect.** None on any result; the gate still requires equality to the cent with the sealed value. Not a loosening of
  a selection or qualification criterion.

## A2 — 2026-11-18T06:20Z — budget accounting against the declared caps (disclosure)

- **Executed fresh simulations** (counted from the commands run, dry runs and failed gate runs included): S0 parity 20
  (four runs of five replays); scratch engineering checks 53; S3 centres 104 (two dry runs and the sealed run); S3
  neighbourhoods 3,072 (12 family runs of 256, two of which stopped at the A1 gate); S4 88; S5 members 2,532 (a 12-member
  dry run and 2,520 sealed); S5 folds, attribution and C24 rows ≈ 252 (two dry runs and the sealed run); S2 overlay 12
  (six candidates' ledgers, dry and sealed). **Total ≈ 6,133 of the 6,200 cap.**
- **Per-use lines exceeded:** S0 + S3 candidates 177 against 160 (dry runs); the margin overlay 12 against 0 (it needs the
  candidates' daily ledgers, which §10 had wrongly listed as "prices only"). Every other line is within its cap.
- **Effect.** None on any result; no search, no new vector. Recorded so that the budget table is not read as exact.

## A3 — 2026-11-18T06:36Z — per-trade window metrics truncated at the window end (defect fix; re-sealed as a new record)

- **Defect.** In `bundle.ts windowMetrics`, the per-trade block (`trades`: trade principal loss maximum and its lot, lots
  over $10k/$25k/$35k, worst realized lot, worst canonical MAE, largest lot giveback, peak profit) measured a lot that was
  still open at the window's END over its whole life, including marks after the window. PROTOCOL §6.2 measures a lot
  "with its whole life to the window end". Affected: windows that end before the ledger end — the development window and
  the 2020/2022/2025 episode windows of `results/audit/centres.json` (FULL replays). Example: L/RA1's development "trade
  PL max" showed $30,366.47 — the April 2025 loss of the Growth·VGT lot opened on 2024-10-30.
- **Not affected.** Every drawdown, its exact attribution, the floor, realized and banked drawdowns (all computed on the
  path up to the window end), the full-history and 2025–2026 windows (they end at the ledger end), the neighbourhood
  records, the Stage 4 replays and the Stage 5 member, selector and fold records (their doors end at the window end), and
  therefore every P2 input and result.
- **Fix.** `truncateLot` (the lot as it stood at the window end); a synthetic test; the corrected windows and episodes of
  all 51 subjects re-sealed as `results/audit/centres-windows-v2.json`, which supersedes only the `trades` blocks of the
  windows and episodes of `centres.json` (the sealed original is kept unchanged). 51 further FULL replays (budget total
  ≈ 6,184 of 6,200).
- **Addendum (06:40Z).** The re-sealed v2 record still carries, for a lot open at a window end, the engine's whole-life
  canonical MAE in `worstCanonicalMae` (five development rows: L/original, L/RA1, `GA0.VA0/R1#2`, `GA0.VD0/R2#1`,
  `GA0.VD0/R2#4`; and episode rows). The tables take the development value from the sealed D24 evidence (Assignment 3's
  `risk.mae.worst`, carried in `members-C24.json`; the corrected development PL maximum equals the D24 replays' for all 48
  matched subjects) and leave the episode value blank. `truncateLot` now also truncates the MAE (code only; no re-seal).

## A4 — 2026-11-18T06:50Z — erratum (no rule change)

PROTOCOL §9.4 says P2b could admit "51 such members"; the archives hold **50** members that failed qualification by
drawdown alone (48 at Q3, 2 at Q5; `selectors.json` `p2bAdmittedBeyondQ1Q6` summed over C19 F, C21 F, C23 F, C24 U). The
rule itself is unchanged.
