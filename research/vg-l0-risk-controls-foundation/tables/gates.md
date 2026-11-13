# Engineering gates (sealed records in results/gates/)

## G0 isolation

| Evaluation digest | Now | Sealed | Equal |
|---|---|---|---|
| priority3 | `147cad7c17eff3fa…` | `147cad7c17eff3fa…` | yes |
| p5b | `3f902532b651da19…` | `3f902532b651da19…` | yes |
| shadow | `54304b69941e0481…` | `54304b69941e0481…` | yes |

## G1–G3 New L0 legacy parity

| Door | Controlled = Priority 3 | Net | Max minute DD | Lots | Funding decisions (refused) | Ledger signature |
|---|---|---|---|---|---|---|
| FULL | yes (+ the sealed 5B R01 record, every field) | $479,605.18 | $20,385.99 | 46 | 79 (33) | `7b17578108747911` |
| D19 | yes | $79,970.17 | $10,633.06 | 6 | 19 (13) | `0d9e277ffa4bc745` |
| D21 | yes | $251,372.87 | $17,280.74 | 17 | 36 (19) | `1746e9a7803b8066` |
| D23 | yes | $338,611.35 | $19,459.83 | 32 | 62 (30) | `4bf56cc9919c9023` |
| D24 | yes (+ 5B's sealed C24 centre, 33 fields) | $382,721.46 | $19,459.83 | 34 | 65 (31) | `0cef34136977805a` |

G2: the D24 run's 34 lots equal 5B's development ledger (34 rows): yes.

## G4 random-configuration legacy parity

120 of 120 runs identical (60 configurations × D21, D24; 5,279 funded lots compared; inclusions V 38, G 40, B 42).

## G5 non-default invariants (pass counts only; AD7)

| Check | Passes (rerun after A2) | First run (sealed, A2) |
|---|---|---|
| determinism | 120 | 120 |
| causality | 395 | 388 |
| causalPrefix | 395 | 395 |
| noOverlap | 120 | 120 |
| sumLots | 120 | 120 |
| fundedFills | 120 | 120 |
| independence | 209 | 209 |
| disabledHold | 737 | 737 |
| protectiveNotEntrySession | 935 | 935 |
| protectiveLevel | 935 | 935 |
| protectiveLoss | 935 | 935 |
| gateNoDecisionWhileBlocked | 123 | 123 |
| gateCooldownBound | 123 | 123 |
| gateEventsWellFormed | 123 | 123 |
| adaptiveHold | 808 | 808 |

Failures: rerun 0; first run 7 (all "causality G:VGT", a tool error fixed by amendment A2).

## G7 frozen work

Preflight: 14 of 14 studies pass. Sealed records verify: vg-lifecycle-matched-optimization 28/28, vg-l0-shadow-eligibility 90/90, vg-l0-walk-forward-diagnostic 10/10, vg-l0-session-hold 27/27, vg-d1-growth-joint 43/43.
