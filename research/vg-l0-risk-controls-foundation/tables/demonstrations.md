# Demonstrations on synthetic paths (correctness, not performance)

From `results/demonstrations.json` (sealed). Grid: X 10%, Y 1%, trailing stop 5%, hold 5 calendar days, L 3, buffer 2%, P 5%, W 5; $100,000 virtual book; 5 bps per side; 11% interest.

## A legacy D1 on the crash path

two maximum-hold losses, then an open lot

| Trade | Kind | Decision | Gate at decision | Entry | Entry raw | Protective level | Exit | Exit raw | Reason | Effective hold, at exit or latest (extended from) | Net |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | deep | 2021-03-05 | off | 2021-03-05 | 90 | — | 2021-03-10 | 77.0000 | maximum hold | 5 | −$14,680.64 |
| 2 | deep | 2021-03-11 | off | 2021-03-11 | 78 | — | 2021-03-16 | 68.0000 | maximum hold | 5 | −$13,058.33 |
| 3 | deep | 2021-03-18 | off | 2021-03-18 | 55 | — | open | — | open | 5 | $5,160.75 |

## B protected D1 (8% stop) on the crash path

a gap through the stop at 80 (level 82.8): loss −11.3%, larger than the 8% distance — not a loss cap

| Trade | Kind | Decision | Gate at decision | Entry | Entry raw | Protective level | Exit | Exit raw | Reason | Effective hold, at exit or latest (extended from) | Net |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | deep | 2021-03-05 | off | 2021-03-05 | 90 | 82.8000 | 2021-03-09 | 80.0000 | protective stop gap | 5 | −$11,320.50 |
| 2 | deep | 2021-03-11 | off | 2021-03-11 | 77 | 70.8400 | 2021-03-12 | 70.0000 | protective stop gap | 5 | −$9,211.91 |
| 3 | deep | 2021-03-16 | off | 2021-03-16 | 62 | 57.0400 | 2021-03-18 | 57.0400 | protective stop | 5 | −$8,152.23 |
| 4 | deep | 2021-03-23 | off | 2021-03-23 | 56 | 51.5200 | open | — | open | 5 | $3,429.26 |

## C stop-protected unlimited hold (15% stop, hold disabled) on the crash path

no maximum-hold exit; stop-level fills at 76.5 and 66.3

| Trade | Kind | Decision | Gate at decision | Entry | Entry raw | Protective level | Exit | Exit raw | Reason | Effective hold, at exit or latest (extended from) | Net |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | deep | 2021-03-05 | off | 2021-03-05 | 90 | 76.5000 | 2021-03-10 | 76.5000 | protective stop | ∞ | −$15,235.64 |
| 2 | deep | 2021-03-11 | off | 2021-03-11 | 78 | 66.3000 | 2021-03-16 | 66.3000 | protective stop | ∞ | −$15,235.64 |
| 3 | deep | 2021-03-18 | off | 2021-03-18 | 55 | 46.7500 | open | — | open | ∞ | $5,160.75 |

## D bounded adaptive hold (base 3, extended 20 days, progress 10%) + 8% stop on the crash path

no progress: the base hold (3 calendar days) applies with a loss at the open

| Trade | Kind | Decision | Gate at decision | Entry | Entry raw | Protective level | Exit | Exit raw | Reason | Effective hold, at exit or latest (extended from) | Net |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | deep | 2021-03-05 | off | 2021-03-05 | 90 | 82.8000 | 2021-03-08 | 88.0000 | maximum hold | 3 | −$2,410.36 |
| 2 | deep | 2021-03-11 | off | 2021-03-11 | 77 | 70.8400 | 2021-03-12 | 70.0000 | protective stop gap | 3 | −$9,211.91 |
| 3 | deep | 2021-03-16 | off | 2021-03-16 | 62 | 57.0400 | 2021-03-18 | 57.0400 | protective stop | 3 | −$8,152.23 |
| 4 | deep | 2021-03-23 | off | 2021-03-23 | 56 | 51.5200 | open | — | open | 3 | $3,429.26 |

## D adaptive hold on the recovery path (base 3, extended 10, progress 5%)

progress reached on 2021-03-08 (high 95 ≥ 94.5): extended from 2021-03-09; the trailing stop exits in profit

| Trade | Kind | Decision | Gate at decision | Entry | Entry raw | Protective level | Exit | Exit raw | Reason | Effective hold, at exit or latest (extended from) | Net |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | deep | 2021-03-05 | off | 2021-03-05 | 90 | — | 2021-03-12 | 100.7000 | trailing stop | 10 (2021-03-09) | $11,566.10 |
| 2 | continuation | 2021-03-16 | off | 2021-03-16 | 96.5 | — | open | — | open | 3 | $3,484.74 |

## Decline gate K = 1, recovery 50%, cooldown 3 sessions + 8% stop on the crash path

arming refused 2021-03-10 to 2021-03-12; the block expires at the 2021-03-12 close

| Trade | Kind | Decision | Gate at decision | Entry | Entry raw | Protective level | Exit | Exit raw | Reason | Effective hold, at exit or latest (extended from) | Net |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | deep | 2021-03-05 | no episode | 2021-03-05 | 90 | 82.8000 | 2021-03-09 | 80.0000 | protective stop gap | 5 | −$11,320.50 |
| 2 | deep | 2021-03-16 | no episode | 2021-03-16 | 62 | 57.0400 | 2021-03-18 | 57.0400 | protective stop | 5 | −$8,152.23 |

Events: 2021-03-09 episode start; 2021-03-09 block engaged; 2021-03-10 arming refused [deep, 2 min]; 2021-03-11 arming refused [deep, 2 min]; 2021-03-12 arming refused [deep, 2 min]; 2021-03-12 episode end (block expired); 2021-03-18 episode start; 2021-03-18 block engaged; 2021-03-19 arming refused [deep, 3 min]; 2021-03-22 arming refused [deep, 3 min]; 2021-03-23 episode end (block expired).

## Decline gate K = 2, recovery 100%, cooldown 10 on the whipsaw path

one failure, then a profitable exit ends the episode; the continuation re-entry is untouched

| Trade | Kind | Decision | Gate at decision | Entry | Entry raw | Protective level | Exit | Exit raw | Reason | Effective hold, at exit or latest (extended from) | Net |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | deep | 2021-03-05 | no episode | 2021-03-05 | 90 | — | 2021-03-10 | 77.0000 | maximum hold | 5 | −$14,680.64 |
| 2 | deep | 2021-03-11 | within allowance | 2021-03-11 | 78 | — | 2021-03-17 | 90.2500 | trailing stop | 5 | $15,408.66 |
| 3 | continuation | 2021-03-19 | no episode | 2021-03-19 | 86.5 | — | open | — | open | 5 | $2,718.21 |

Events: 2021-03-10 episode start; 2021-03-17 episode end (profitable exit).
