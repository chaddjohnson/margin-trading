# D1 risk controls — specification RC 2 (entry-day protective-stop activation)

RC 2 = RC 1 (`research/vg-l0-risk-controls-foundation/SPECIFICATION.md`, unchanged and still authoritative for every
RC 1 configuration) **plus one optional property of the unconditional protective stop: its activation.** Written before
any real-data evaluation of the new mode. Code: `src/d1-risk-controls-rc2/` (`config.ts`, `exit.ts`, `book.ts`,
`run.ts`, tests in `tests/`). RC 1's files (`src/d1-risk-controls/`) are **not edited**: their sha256 stay those pinned
by the foundation's freeze.

> **A protective stop is not a guaranteed loss cap.** Neither activation mode bounds a loss: a minute that opens below
> the level, an overnight gap, a halt or a fast market fills below the level, so the realized loss can exceed the stop
> distance by any amount. Entry-day activation only adds observations after the fill on the entry session; it removes
> neither gap risk nor execution risk. The synthetic tests show losses of 13% and 22% under an 8% stop.

## 1. The property

| Field | Values | Default | Valid where |
|---|---|---|---|
| `protectiveStop.activation` | `next-session`, `entry-day` | `next-session` (RC 1 behaviour) | only on `protectiveStop: { mode: 'on', … }`, only in a `version: 2` configuration; refused on a stop that is `off` and in a `version: 1` configuration |

- **Next-session** (RC 1, unchanged): the stop acts only for a position open at the start of a session.
- **Entry-day**: after the entry has actually filled, the stop may also trigger later in the fill's own session, from
  observations demonstrably after the fill (§2). From the next session on, RC 1's rules apply unchanged.
- Independent per book (`D1:GDX`, `D1:VGT`). Growth books never carry controls.
- **Only the protective stop** gains entry-session activity. The trailing stop, the maximum hold (every mode), the
  buffered loss and the decline gate never act on the entry session in either mode (the D1 convention). The level is
  RC 1's: L = the entry fill's **raw** price × (1 − d ÷ 1000), fixed at the fill, immutable, active whether or not the
  position was ever profitable.

## 2. Eligible observations (causality)

The existing fill mechanism (`firstTradeAfterDecision`, `priceAt`) fills an entry either at the **opening print of a
regular-session minute k** (the first trade at or after the decision: the next minute after the confirming minute, a
later minute when minutes are missing, or the session's first minute for an order carried overnight) or at the
session's **closing print** (a decision in the last minute before the close).

| Fill | First eligible observation | Why |
|---|---|---|
| Opening print of minute k | the **rest of minute k**: its low (minute k's open is the fill itself and lies above L) | the opening print is minute k's first trade; a low ≤ L < e is strictly below the fill price e, hence a different, later trade |
| | then every later minute j > k in full: its opening print first, then its low | wholly after the fill |
| Opening trade of the session (order carried overnight, k = 0) | as above with k = 0; there is **no session-gap case** (the session opened at the fill) | — |
| Last minute of the session (k = count − 1) | that minute's low only; the closing print is not a stop observation | RC 1 convention for every stop |
| Delayed fill (missing minutes before k) | from minute k; missing minutes are simply absent | — |
| Closing print (k = count) | **none in that session**; the stop first acts at the next session's opening trade, exactly as next-session | nothing observable follows a closing-print fill in its session |

Minutes **before** the fill minute are never read, whatever their lows. No intra-minute ordering is manufactured: a
minute's high/low is used only when every trade of that minute is at or after the fill (the fill minute, whose first
trade is the fill) or wholly after it (later minutes).

## 3. Fills, boundaries and competing exits

| Item | Rule |
|---|---|
| Minute opening through L (j > k) | fills at that **opening print** (below L: `minute open through stop`) |
| Low reaching L | `stop` fill convention: fills **at L** (`stop level`, the RC 1 assumption that a resting stop sold at its level); `next-open`: at the next minute's open, or the closing print, else the trigger minute's close (`trigger minute close`) |
| Threshold equality | inclusive: a price ≤ L triggers (RC 1's and the trailing stop's convention) |
| Fill-minute exit | an exit at the fill minute itself executes in that minute after the fill; Priority 3's pool already executes "a new lot's exits due in its own fill minute" (unchanged) |
| Competing exits on the entry session | none can exist: no other D1 exit acts on the entry session |
| Costs and stresses | proceeds × (1 − cost); the stop-slippage stress applies exactly as to RC 1 protective fills; interest is 0 for an exit on the entry session (calendar days) |
| Logging | exit reason `protective stop` (the RC 1 reason; never `protective stop gap` on the entry day); the per-trade record of an entry-day book carries `activation: 'entry-day'` and `entryDayExit`; the summary counts `entryDayExits` |
| Gate and continuation | an entry-day exit always loses: it is a failed attempt for the decline gate and opens no continuation window; the flat-at-start rule forbids a re-entry on the exit session |
| Session boundaries, holidays, missing prints | sessions are the data's sessions; weekends and holidays are absent sessions; a session without a closing print has no closing-print fill or sale; the next-open convention falls back as above |
| Split adjustment | unchanged from RC 1: the level assumes one continuous price scale; the development doors contain no VGT or GDX split, FULL applies forward adjustment (VGT 8:1 on 2026-04-21 is continuous) |

## 4. Identity and compatibility

- A configuration whose books all use next-session activation **is an RC 1 configuration**: canonical version 1, the
  activation dropped, RC 1's identity (`rc1-…`, or Priority 3's `quadId` when legacy) and RC 1's evaluation key, byte for
  byte (tested on 300 random configurations).
- A configuration with at least one entry-day book: canonical version 2, identity `rc2-` + 16 hex of sha256(`rc2#` +
  canonical JSON + `#` + the canonical quad with RC 1's inactive genes masked), evaluation key = Priority 3's key of the
  masked quad + `|rc2:` + canonical JSON. The activation is canonical only when non-default and only where the stop is
  ON (inactive elsewhere: refused).
- The book runner `runD1BookRc2` is RC 1's `runD1BookWithControls` with one addition (a fill-minute exit executes after
  the fill); with next-session activation everywhere it equals RC 1 exactly (books and logs), and with legacy controls
  Priority 3's `runD1Book` exactly.

## 5. Verification

- Synthetic (`src/d1-risk-controls-rc2/tests/`, 35 tests): identities and keys (RC 1 unchanged; rc2 versioned; masking;
  round trips; refusals), the eligible observations of every fill kind, the fill conventions, inclusive equality,
  causality (pre-fill lows ignored; later minutes do not change the decision), same-session adverse moves, an 8% stop
  exceeded by an entry-day minute gap (−13%) and by a next-morning gap (−22%), closing-print and overnight-carry fills,
  the gate and slippage, determinism, RC 1 parity on 150 random paths, and the pooled runner (legacy = Priority 3, next-
  session = RC 1, a funded lot entering and exiting in one session and in one minute).
- Real data: the study's stage V (`research/vg-l0-risk-families/PROTOCOL.md` §12) before any search.
