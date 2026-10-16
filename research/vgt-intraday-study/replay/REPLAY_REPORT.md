# Independent replay of the VGT intraday study engine

Date: 2026-10-15. Result: **all 8 configurations match the study engine trade for trade, bit for bit** (every
compared value differs by exactly 0.0, not merely within 1e-6). The `CLOSE_1M` + `STOP_DAILY` replay also
matches `allIn.ts` output that I generated myself, on four windows.

## Method

* `replay.py` is pure Python 3 standard library (`csv`, `datetime`, `zoneinfo`, `json`, `bisect`). It reads
  the raw `data/VGT/VGT-2016-2025-1-minute.csv` and groups America/New_York sessions the way
  `src/lib/session.ts` does: regular minutes from 09:30 up to the scheduled close, the bar starting at the close
  used as the closing print (its open), the early-close list copied from session.ts, session high/low widened
  by the close, and a closing print with no regular bars dropped.
* It then implements PROTOCOL.md §§2, 4, 5, 6, 7 from the text and from `allIn.ts`: warm-start history
  (recentHigh over the previous 78 sessions of the full array), trading window 2016-10-07 → 2025-10-13, fixed
  constants, 0 bp, `stop` fill, the allIn exit order, profit-conditional activation, the restriction/reset
  logic, the seven entry mechanisms used here, and the minute-causal stop.
* Sources read: PROTOCOL.md, `src/app/allIn.ts`, `src/lib/session.ts`, `src/lib/csv.ts`. **Nothing under
  `src/intraday-study/` was read.** The interpretations were written to `NOTES.md` before any comparison.
* Comparison: our `out/<CONFIG>.csv` against `results/runs/continuous/<CONFIG>__stop/trades.csv`, trade by
  trade. Compared fields: count, entry_date, entry_price, exit_date, exit_price, exit_reason, profit
  (`profit_after_interest`), plus decision_price. A separate check also compared interest, and the entry,
  decision and exit times after converting ours to ET minutes. The tolerance was 1e-6.
* Incumbent anchor: I ran `allIn.ts` myself (`npm run app allIn …` into the scratchpad, with no repository
  file written). `replay.py --allin` reruns `CLOSE_1M` + `STOP_DAILY` on allIn's own legacy session filtering
  and compares the result with allIn's trades.csv.

## Interpretations

They are listed in full in `NOTES.md`. These are the ones that carry weight:

1. Eligibility `E ≤ start+60 ≤ close−60`, with E converted through the session's own UTC offset.
2. STABLE gap: the timer is set to 0, then the bar is processed, so a gap bar that is not a new low ends at
   timer 1. PERSIST gap: the counter restarts at 1 if the bar dips, else 0.
3. Candidates are evaluated with the gate one by one. A blocked candidate does not reset the mechanism.
4. BAND_STABILIZE keeps one run state (trough, timer, run length) shared by STABLE and REBOUND. A band change or
   a non-dip bar ends the run. The CLOSE_1M (SHALLOW) branch is evaluated after all eligible bars, on the
   incumbent's decision price.
5. Minute stop: H starts at the fill. The fill's bar raises H and sets the first stop. Triggers start at the
   next bar. Activation is re-evaluated before every bar with the current stop. After a session,
   H = max(H, close). A due max hold with no later trade means no exit and no minute checks, but H still
   updates.
6. A same-session round trip while restricted: the entry clears the old restriction at the entry. A material
   loss on the same-session exit then creates a new restriction, and that restriction is subject to the
   recovery check at the session end. allIn.ts never produces this case.

## Match table (continuous window, `stop` fill, 0 bp)

| Config | Replay trades | Study trades | Total P&L, replay (realized + open mark) | Study total (Σ net_0bp) | Max abs field diff | Result |
|---|---|---|---|---|---|---|
| CLOSE_1M + STOP_DAILY | 171 | 171 | 203405.2102172692 | 203405.2102172692 | 0.0 | MATCH |
| FIRST_1000 + STOP_DAILY | 204 | 204 | 127443.12126841942 | 127443.12126841942 | 0.0 | MATCH |
| STABLE_15 + STOP_DAILY | 197 | 197 | 152561.66498786098 | 152561.66498786098 | 0.0 | MATCH |
| REBOUND_05 + STOP_MINUTE_CAUSAL | 196 | 196 | 155460.21146009743 | 155460.21146009743 | 0.0 | MATCH |
| PERSIST_30 + STOP_MINUTE_CAUSAL | 175 | 175 | 100659.86046733275 | 100659.86046733275 | 0.0 | MATCH |
| BAND_STABILIZE + STOP_DAILY | 176 | 176 | 158441.31077218932 | 158441.31077218932 | 0.0 | MATCH |
| BAND_STABILIZE + STOP_MINUTE_CAUSAL | 185 | 185 | 178206.4929751901 | 178206.4929751901 | 0.0 | MATCH |
| FIRST_0935 + STOP_MINUTE_CAUSAL | 215 | 215 | 140817.98733695733 | 140817.98733695733 | 0.0 | MATCH |

Entry, decision and exit times (ET minute) also match on every trade: 0 time mismatches.

Checks against allIn.ts (`CLOSE_1M` + `STOP_DAILY`, legacy filtering, `stop` fill; allIn.ts run by me on
2016-10-07 → 2025-10-13 and on the whole file, plus the study's golden allIn outputs for 2020 and
2024-01-02 → 2025-10-13):

| Window | Trades | Total | Result |
|---|---|---|---|
| 2016-10-07 → 2025-10-13 | 171 / 171 | 203405.2102172692 | MATCH (my allIn trades.csv is also byte-identical to the study's golden allIn file) |
| whole file | 178 / 178 | 197460.72261778914 | MATCH |
| 2020-01-02 → 2020-12-31 | 21 / 21 | 35841.835725310266 | MATCH |
| 2024-01-02 → 2025-10-13 | 33 / 33 | 51759.85846004739 | MATCH |

The run also covered these paths: maximum-hold, gap and intrabar stop exits in every configuration; 13–21
lower-price re-entries and 25–33 restrictions per configuration; 13 same-session round trips under the minute
stop, 6 of them lower-price re-entries; 5 entries on early-close sessions; and the 2019-08-12 no-fill signal.
In BAND_STABILIZE every band branch was used (SHALLOW/close 82, MODERATE 41, DEEP 25–27, EXTREME 28–35).

## Mismatches and diagnosis

None. No first mismatch exists in any configuration, so there was nothing to diagnose.

### How strict this test is (`sensitivity.py`)

A zero-difference match only means something if the alternative readings would have produced different trades.
I reran the replay under alternative readings:

| Alternative reading | Configurations that change |
|---|---|
| STABLE gap bar leaves the timer at 0 (not 1) | STABLE_15 + STOP_DAILY |
| E compared with the bar start, not its completion | all 7 intraday configs |
| A gate-blocked candidate ends the session's attempts | all 7 intraday configs |
| Same-session round trip does not clear the existing restriction | REBOUND_05, BAND_STABILIZE and FIRST_0935 (all minute stop) |
| Gate without the provisional episode low | none (not exercised by the data) |
| Minute stop also checks the fill's own bar | none (not exercised) |

So the exact match does confirm, against an independent implementation, that the study engine uses
completion-time eligibility, counts the STABLE timer after a gap as written in §5, keeps evaluating after a
gate-blocked candidate (§4), and clears the restriction at the entry even when the position exits the same
session. On two points the data has no case that would tell readings apart: the provisional episode low in
the gate, and excluding the fill bar from minute triggers. Agreement on those two is by construction only, and
CLOSE_1M agreeing with allIn.ts covers the provisional low for the incumbent.

## Rerun

From the repository root:

```sh
python3 research/vgt-intraday-study/replay/replay.py --compare   # writes out/*.csv, out/summary.json, out/comparison.json (~10 s)
python3 research/vgt-intraday-study/replay/sensitivity.py        # how strict the comparison is (~1 min)
# optional allIn.ts anchor (writes only to the given output dir):
npm run app allIn VGT 2016-10-07 2025-10-13 data/VGT/VGT-2016-2025-1-minute.csv <dir> stop
python3 research/vgt-intraday-study/replay/replay.py --allin <dir>/trades.csv 2016-10-07 2025-10-13
```
