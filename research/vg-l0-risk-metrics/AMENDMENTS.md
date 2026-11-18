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
