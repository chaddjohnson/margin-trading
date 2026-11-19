# Shadow-position entry eligibility — implementation (brief Phase 1 and 7.1)

EXPERIMENTAL, research only: an evaluation option of this study's own allocator. It is OFF by default (all three toggles
OFF = the frozen New L0 allocator exactly). It is not wired into Strategy Lab, the canonical engines or any live process.

## 1. Where it lives

| File | Role |
|---|---|
| `src/vg-l0-shadow-eligibility/allocator.ts` | `runShadowPool`: a study-local copy of Priority 3's `runPool` (`src/vg-d1-growth-joint/pool.ts`, unchanged) with every insertion marked `SHADOW` |
| `src/vg-l0-shadow-eligibility/position.ts` | `realPathOf`: the independent real position of a delayed entry, driven by the canonical ShadowBook / ExitManager / PositionRules |
| `src/vg-l0-shadow-eligibility/evaluate.ts` | the toggles (`sh` = D1·GDX, D1·VGT, Growth·VGT bits), the real-position specifications of each book, the evaluation and the record's shadow summary |
| `src/vg-l0-shadow-eligibility/report.ts` | the funded-lot and shadow-episode ledgers, annual figures, attribution and utilization of a detailed run |
| `src/vg-l0-shadow-eligibility/tests/{allocator,position}.test.ts` | deterministic state-transition and chronology tests |
| `src/vg-l0-shadow-eligibility/parity.ts` | stage V (G1–G11) on real development data |

Priority 3's engine files and every other historical engine file are unchanged; Priority 3's evaluation digest on this
branch is its historical sealed `147cad7c…` (brief §0.2). The reused machinery: Priority 3's virtual books (`booksOf`,
`runD1Book`, `runGrowthBook`), the canonical D1 ShadowBook and ExitManager (`src/multi-etf-allocator/shadow.ts`,
`src/shared-margin-portfolio/strategy.ts`), Growth 1.4.0's exit parameters and PositionRules (`src/growth-trading/`),
Priority 3's compact record (`recordOf`).

## 2. The four kinds of object

1. **Rejected entry signal** — a virtual decision of a book refused at its own instant because the one slot was occupied
   or reserved (`FundingRecord.reason = 'slot occupied'`).
2. **Hypothetical shadow position** — the book's own virtual trade (L0: the book keeps it under its canonical rules from the
   decision to its final virtual exit; it never reserves capital and never preempts a funded position).
3. **Persistent eligibility (an episode)** — while that hypothetical trade is open, the refused opportunity of a toggled book
   may compete for capital at each release of the slot (`ShadowEpisode`).
4. **Actual funded position** — a lot of the one slot: granted at its own decision (it mirrors the virtual trade: Priority 3's
   rule, unchanged) or a **delayed real entry** granted to an episode (a new position with independent state).

## 3. Lifecycle

```
refusal ("slot occupied") of a toggled book ──► episode LIVE  [eligibility from the decision time]
      │                                              │
      │  hypothetical (virtual) trade continues      ├─ hypothetical final exit ──────────► ENDED "hypothetical exit"
      │  under the book's own rules                  │   (also when it happens at or before a release check)
      │                                              ├─ release check, slot free, first in the tie order ─► CONSUMED
      │                                              │      └─► delayed order (reserves the slot) ─► fill ─► funded lot
      │                                              │          (its own exits only; never the hypothetical one)
      │                                              ├─ release check lost (fresh entry first / higher-priority
      │                                              │   shadow / blackout / not executable) ─► stays LIVE
      │                                              └─ door's end ────────────────────────► ENDED "door end"
```

- **Activation:** only a refusal with reason "slot occupied" of a book whose toggle is ON (the occupant may be another book's
  lot or order, or the same book's delayed lot or order). Refusals for "component disabled", "before the funding start" or
  "blackout" never open an episode.
- **Expiration:** only the hypothetical trade's final exit (eligibility = [decision time, final exit time)), consumption by a
  delayed entry, or the door's end. No age limit, no price guard, no re-check of the entry predicates. A never-filled
  hypothetical order stays eligible; a partial (retention) exit does not end eligibility.
- **One live episode per book:** a book decides only after its virtual trade has exited, so a second refusal while the first
  hypothetical trade is open cannot occur (asserted: the run throws).

## 4. Capital release and event ordering

At one pool instant T (a bar start of either symbol, or a session close) Priority 3's order is unchanged: decisions stamped
≤ T in the tie order → the exits of the symbols printing at T → the fills at T → the mark. SHADOW adds:

1. When a funded lot's **final** exit fill at bar k of session s happens, a release check is scheduled at
   **D = the bar's start + 60 s** (the end of the release minute), or at the session's close for a closing-print exit.
2. `decideUntil` takes every fresh decision stamped ≤ D before the release check (**fresh signals first**; a fresh decision
   stamped exactly at D also goes first).
3. At D: if the slot is free and D's session is fundable, the live episodes whose hypothetical trade is open **strictly
   after D** compete in the **frozen same-instant order** — D1:GDX, D1:VGT, G:GDX, G:VGT (D1 before Growth, then GDX before
   VGT; the order Priority 3 uses for simultaneous decisions). The first whose real position can be placed is granted; the
   others stay live.
4. The delayed order reserves the slot and fills at its book's fill rule from D: the first trade of its symbol at or after
   D (the closing print only for D before the close; otherwise the next session's first trade). Until then fresh decisions
   are refused ("slot occupied"), and recorded as **displaced** by the delayed order or lot.
5. The day-skipping fast paths treat a pending release check as a decision (no session with a pending check is skipped).

## 5. The real position (independent state)

`realPathOf(spec, s, D, end)` creates a fresh ShadowBook of the book's family on the door's dataset (its entry machine
never arms), commits one order at (s, D) — Growth: with the initial-stop availability check at D and the ATR fixed for the
fill session, exactly as for any Growth order — and steps the canonical per-session order (beginSession; per bar the exits,
then the fill; Growth: the rules' fill-minute exits and partial sales; afterSession) until the final exit or the door's end.
Entry time and price, shares, cost basis, the trailing stop (from the post-fill high), the holding clock (from the fill
session), interest (from the fill session), the initial stop and retention state all start at the delayed fill. Nothing is
inherited from the shadow trade; the shadow trade never closes the funded lot. Verified: re-simulated from every virtual
trade's own decision, the harness reproduces it exactly (1,982 virtual trades in stage V G8; synthetic D1 and Growth with
initial stop and retention in `tests/position.test.ts`).

## 6. Toggles and defaults

Three independent toggles (D1·GDX, D1·VGT, Growth·VGT); Growth·GDX is not part of the study (its book is disabled and has
no toggle). Default all OFF. With '000' no SHADOW code runs: the replay equals Priority 3's `runPool` field for field and the
archive key is Priority 3's (stage V G2: 1,000 archived 5B records reproduce; G6). Any other combination appends `|sh<bits>`
to the key and adds `shadow` to the record. In the search the toggles are structural (categorical) genes (`config.ts`).

## 7. Differences from the original allocator

| Situation | Original (all OFF) | With a toggle ON |
|---|---|---|
| A refused entry | the book keeps its virtual trade; capital freed later never revives it | it stays eligible while its virtual trade is open and may be entered at a later release |
| A release with no fresh decision | the slot stays idle until the next fresh decision | the highest-priority live shadow is entered at the end of the release minute |
| A funded lot | always mirrors its virtual trade | a delayed lot follows its own independent exits |
| A book's own decision while it holds capital | impossible (its lot mirrors its virtual trade) | possible while its delayed lot is open: refused, may open a new episode |
| Capital occupancy | the virtual trades' own windows | longer: delayed lots occupy the slot in otherwise idle stretches (and can displace later fresh entries) |

## 8. Persisted diagnostics

Per episode (`report.ts EpisodeRow`): book and symbol, original signal time and decision price, occupant (and whether it was
a delayed lot or the book's own), hypothetical entry, exit, exit reason and net (descriptive only), eligibility window and
end reason, release checks and their losses, whether it persisted to a release, and the delayed entry (decision instant,
fill time and price, lot id, the lot's own net and exit reason, waiting in sessions and calendar days). Per funded lot
(`LotRow`): fresh or delayed, decision, entry, exit, reason, principal, net, interest, costs, MAE/MFE, days held, and the
decisions it displaced. Ledgers are sealed JSON + CSV under `results/phase2/ledgers/`, `results/diagnostics/ledgers/` and
`results/validation/ledgers/`, apart from the funded-trade results.
