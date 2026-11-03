# Methodology review 2 — execution semantics, causality and data embargo (independent read-only agent context)

Reviewer: a separate Claude agent context with read-only instructions (no file changes, no runs, no market data),
emphasis on execution semantics and causality. Reviewed draft: PROTOCOL.md v1.0 (pre-freeze), ENGINE_CONTRACT.md,
MECHANISM_CATALOG.md, plus the draft (untracked) fast engine read-only. Received 2026-10-29, saved by 14:35Z (clock at the following checkpoint). Text below is the
reviewer's final message, verbatim.

---

## Review: Stage 1c execution semantics, causality and data embargo (draft v1.0)

Scope: I read BRIEF.md, PROTOCOL.md, ENGINE_CONTRACT.md, MECHANISM_CATALOG.md, Stage 1b ENGINE_CONTRACT.md and AMENDMENTS (A1), the Stage 1b `engine.ts`, the D1 file (`allIn-trailingBuy-postExitContinuation.ts`), `config/phenotypes/D1/VGT.json`, `src/lib/{evaluation,csv,session,dataset}.ts` and Stage 1b `data.ts`. I also read the untracked draft `src/study3-vgt-momentum-stage1c/engine.ts` (read-only) as evidence of how the contract is being read. Nothing under `data/` was opened; I only listed file names.

---

### 1. [BLOCKER] PROTOCOL §12 `audit` ("baseline `npm test` status") vs §2 ("no 2024–2026 file … or `all` dataset is opened"); brief §1, §7
**Problem.** When `data/` is present, `npm test` runs real-data tests that parse or run on VGT bars after 2023:
- `src/pools/tests/pools.test.ts` runs B4/B5 on the canonical `all` dataset through 2026-10-13. VGT is a member (`config/pools/B5.json` regressionAnchors).
- `src/multi-etf-allocator/tests/datasetParity.test.ts` runs VGT on `all` through 2025-10-13.
- `src/phenotype/tests/injection.test.ts` reads the whole VGT file as text.
- `src/b4-b5-robustness/tests/regression.test.ts` and `src/d1-signal-capital-complementarity/tests/realData.test.ts` hash the whole file.
- `src/market-events/tests/ledger.test.ts` reads VGT distributions through 2026.

The `audit` stage as written would therefore run strategies on 2024–2026 VGT bars, which is exactly the brief's "generic `all` datasets" path. Stage 1b's audit also ran `npm test` (IMPLEMENTATION_AUDIT: 791 tests) and that is not disclosed.

**Fix.** Run the project suite only in a separate `git worktree` that has no `data/`. The directory is git-ignored, and every real-data test has a presence or sha guard, so they all skip. Record pass/fail/skip counts and the names of the skipped tests. Forbid `npm test` in the main checkout for the life of Stage 1c. Keep Stage 1c tests synthetic-only. Add Stage 1b's precedent to the §1 leakage register.

### 2. [MAJOR] PROTOCOL §2 bounded loader and §1 item 6 ("never parses a row past its bound")
**Problem.** The claim cannot hold as specified, for three reasons:
- Finding the stop row means parsing its timestamp. For H that row is the first 2024 row; for A–D it is the first row of the evaluation year.
- If the loader is built like `loadCsvMinuteBacktestData` (csv-parse stream plus `parseMinuteBar`), csv-parse tokenises the whole buffered chunk (on the order of 1,000 rows, ~64 KiB) into field arrays inside `_transform` before the consumer breaks. `parseMinuteBar` on the stop row also parses its OHLCV.
- The sealed record is to store "the stop row's timestamp", which writes a post-door datum into a sealed record.

The equivalence proof (loaded-bar hash = Stage 1b `door.<h>.loadedBarsSha256`; I checked all five are present) is sound for **dataset identity**. The hash covers every array the engine reads, and Stage 1b kept exactly the rows below end + 2 days from a fully order-checked file. It proves nothing about **boundedness**.

**Fix (contract wording).**
- Read raw chunks and split on `\n` by hand.
- For each line, validate the first field against `^"?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z"?,` and fail closed if it does not match.
- Compare its first 10 characters (the UTC date) lexicographically with the bound date. Stop at the first line whose date is at or after the bound, before any CSV tokenisation or `parseMinuteBar` call.
- Only lines before the stop line are parsed.
- Record the stop line's byte offset and the sha256 of bytes [0, offset). Do not record its timestamp; record "first line with UTC date ≥ <bound>".
- Disclose that up to 64 KiB of undecoded bytes past it sit in a buffer.
- Add a "poisoned tail" test: lines after the bound are malformed (non-numeric prices, non-UTC times, out-of-order times) and the loader must still return the clean dataset. A malformed line before the bound must fail.

### 3. [MAJOR] ENGINE_CONTRACT §11.2 (blockB), §11.1, PROTOCOL §8.2: B reads a stale loss record across boundaries
**Problem.** `blockB` ignores `consumed`, and transitions never write R. Example:
- Trade k of P_old stops out at session x with net < 0.
- Trade k+1 enters at x+2, which consumes R.
- Trade k+1 is liquidated by the S1 transition at b+1.
- The new pick has B with C = 40, so it discards every decision at s < x + 40.

That cooldown is keyed to a trade that is not the last completed one, and it is imposed again after an entry has already happened in between. This contradicts brief §5B ("after the **last completed** … trade"). S3 has the same problem. A single policy can never re-enter inside its own cooldown, so only executable schedules are affected — which means exactly the verdict path Π1. The draft engine has the same omission.

**Fix.** `blockB(s, m) = R ∧ ¬R.consumed ∧ R.net < 0 ∧ s < R.exitIndex + C + m`. This is provably a no-op inside one policy. State that transition and conversion exits neither start, extend nor clear a cooldown, and report Π1's losing transition exits (count and $).

### 4. [MAJOR] PROTOCOL §4.3 B ("discarded (not queued)"), ENGINE_CONTRACT §11.2 (minute rule "reference keeps accumulating"); brief §5B "never buy automatically when a timer expires"
**Problem.** For conditions that persist like a state, the cooldown effectively queues the entry.
- **E09 (mode low).** The reference is the running minimum since the exit. Any rebound of at least y during the cooldown leaves `bClose ≥ ref(1+y)` true, so E09 fires in the first minute of session x+C+1 and fills at minute 1, whatever has happened since. That is a buy at release, not a new signal.
- **Level families (state IN) and R3F (C_s > stoppedHigh).** These buy at the first permitted close if the condition held through the cooldown.

Only event triggers are truly discarded. E10 (mode high) is fine because its reference ratchets upward. The protocol justifies the level case ("its own rule, not a timer") but says nothing about E09 or R3F, and the planned tests cannot detect a release-time buy.

**Fix (choose before freeze).**
- (a) Intraday families: "While blockB(s, true) holds the reference is not updated. At the first minute of session exit + C + 1 it restarts as after an exit (low: +∞)." This requires a fresh y-rebound after release.
- (b) Declare persist semantics for state conditions and discard semantics for events, uniformly. Add a per-trade flag `releaseEntry` (decided at the first permitted decision point), with counts and net reported in PROTECTION_RULE_ABLATIONS.
- (c) Optionally, a predeclared secondary variant that requires a fresh 0→1 transition of the family's state after release.

### 5. [MAJOR] ENGINE_CONTRACT §11.2–§11.3: side effects of a discarded decision are unspecified
**Problem.** "The chosen entry is discarded" does not say whether decideFlat's side effects after the choice still run: `campaign := undefined` (first entry), `refActive := false` (Stage 1b §5: "a chosen entry … deactivates the intraday reference"), and use of the adoption label. A reference written from the contract alone could still deactivate E09/E10's reference on every blocked R3F or fresh close decision and so take different paths. Parity (b) would then fail, which is rubric 1, "Invalid". The draft gets this right only because it nulls `entry` before that block.

**Fix (wording).** "A discarded decision has no effect beyond the counters and block rows: `pending` stays undefined; the campaign object, refActive, refValue and triggerFrom are unchanged; no adoption label is consumed. A prevented minute firing leaves refActive true and updates refValue exactly as Stage 1b does when `allowed` is false (in high mode the own-condition test precedes ref := max(ref, bHigh))."

### 6. [MAJOR] ENGINE_CONTRACT §11.1 `reset` vs PROTOCOL §8.2 Π1-reset: three inconsistencies
**Problem.**
- (i) The contract resets "after §6's boundary processing at b's close", that is after `decideFlat(new, b)` at a flat boundary. The new policy's adoption decision is therefore filtered by a record that is then erased. The draft engine resets *before* decideFlat, so contract and code already disagree.
- (ii) The protocol says "every boundary"; the contract says "where the active policy changes". Identical picks skip §6 entirely.
- (iii) It is unspecified whether an old position's own-rule exit after b writes R under `reset`: an S1 pending close-decided reason executed at b+1, or an S2 continue-old exit.

**Fix (wording).** "Under reset, at a boundary b whose new policy id differs from the active one, R := none immediately after the pending entry is cancelled and before any decideFlat(new, b). Own-rule exits executing after b write R as usual." Or choose otherwise, but make §8.2 and §11.1 say the same thing.

### 7. [MINOR] ENGINE_CONTRACT §11.1 (`below`), §11.3; PROTOCOL §4.3 C-cross; brief §5C "cross from below"
**Problem.**
- `below` updates only while the active policy has C, and with the active policy's Y. After a switch it reflects the wrong level, or was never computed.
- At an adopt-flat boundary decideFlat runs twice (old policy, then new), so the flag is updated with both Ys and the blocks are double-counted.
- Minute closes are ignored although minute rules decide intraday.
- Because the exit session's close counts, and a stop usually fills near the session low, `below` is true almost at once. C-cross ≈ C, so the variant cannot answer the brief's question.

**Fix.** Store `minFlatClose` in R (the minimum flat close from the exit session on, independent of policy) and set below := minFlatClose < level(active Y). Redefine C-cross as an actual upward cross at the decision: the prior observation (prior close for close rules, prior minute close for minute rules) is below the level and the decision price is at or above it, after the arming exit session. Count a block only for the decision that survives the boundary, or tag block rows with the policy id.

### 8. [MINOR] ENGINE_CONTRACT §11.5 eligibility offset; PROTOCOL §4.3 "N × 24 h of NY wall-clock"; rubric (h) "+1 minute"
**Problem.** Under the delay stresses every opening-order entry fills at the delayed bar, so offset = 60d > 0 and every d = N session becomes ineligible. The +1 and +5 minute stresses therefore silently turn A into N+1 days for every trade, mixing an execution stress with a parameter change inside a binding rubric item. Separately, "N × 24 h wall-clock" is not what the rule computes (DST changes; the first bar can be after 09:30). The operational rule itself is DST-safe, because sTime is the NY date's UTC midnight (`session.ts`).

**Fix.** "offset = entry fill time − time of the session's scheduled opening-fill bar (`delayed` = firstTradeFrom(e, bTime[start_e] + 60·delay)); a fill at that bar has offset 0." Replace the 24 h wording with the operational definition.

### 9. [MINOR] ENGINE_CONTRACT §11.5: fill semantics under delay and fallback
**Problem.**
- (i) In mode `open` with delay > 0, the fill is at `delayed` and treated as an opening fill, but the decision uses x₀ = bOpen[start]. The idealised mode stops being "decide on the print you fill at".
- (ii) In mode `next` with d > 0: if bOpen[aBar] ≤ level, the contract hands over to step 3, whose stop fill is delayed again to firstTradeFrom(bTime[aBar] + 60d). An order already working is replaced by a later fill, and under the stop-slippage stress the same price takes extra slippage.
- (iii) The fallback (aBar = count−1, filled at that bar's close) runs at step 2b before step 3 for that bar, so a fill at the minute's close pre-empts a stop touched within that minute.

**Fix.**
- (i) In mode open, x₀ := priceAt(s, delayed), or disallow delay in mode open.
- (ii) "At k = aBar > 0 the losing-hold order is working: if bOpen[aBar] ≤ level the position sells at priceAt(s, aBar) (no further delay) with reason `stop` | `losing hold` [choose] and [stated] slippage." Keep stop-gap precedence at k = 0.
- (iii) In the fallback, run step 3 on bar count−1 first, and sell at its close only if still long.

### 10. [MINOR] MECHANISM_CATALOG §4.1–4.2, PROTOCOL §1.5/§4.3: "N = 8 (D1)" is D1's rule only for opening fills
**Problem.** D1 counts days from the fill **session's date** (`entryTimestamp: session.time`, line 924; `daysHeld >= maximumHoldDays`, line 201), whatever the fill minute, and D1's own entries are intraday fills. Under Stage 1c's offset rule an intraday, closing-print or delayed fill becomes eligible one date later, and Stage 1c also adds the sell fee. The catalog's "generalised (fees added, N searched)" understates the difference.

**Fix.** State: "D1: an intraday fill on F is eligible at the first session dated ≥ F+N. Stage 1c (the brief's 'actual entry timestamp'): the first session dated > F+N for fills after the first bar. R8 equals D1 only for opening fills and without the fee." Optionally add a labelled `aClock: 'date'` sensitivity for E09/E10.

### 11. [MINOR] ENGINE_CONTRACT §12 (XN) and MECHANISM_CATALOG §4.1 "as D1 primary"
**Problem.** D1 decides whether the stop is active before the open, with interest accrued **through the applying session's date** (lines 147, 199, 985). B-D1N/XN uses I_trade(max(s, entry)) through the **deciding close s**. That is 1–4 calendar days less interest (~$30 a day at $100k and 11%), so XN activates slightly earlier near breakeven. XN's hard stop is also live from the fill bar on the entry session, whereas D1 checks no exit on the entry session and has no hard stop.

**Fix.** Either use I_trade(s+1) in XN's test (the next session's date is calendar knowledge at s's close), which takes XN out of parity (a) or makes it a separate component, or keep B-D1N and state both deviations explicitly.

### 12. [MINOR] PROTOCOL §4.3 B vs ENGINE_CONTRACT §11.2: the release rule is stated two ways
**Problem.** The headline "no entry may fill before exit + C + 1" is not the rule that operates. A minute decision in session x+C that has no eligible trade left (fill carried to x+C+1's open) is blocked, while a close decision at x+C that fills at the same open is allowed. Two readers can implement different rules.

**Fix.** Make the decision-session rule the definition and drop the "fill before" sentence. Alternatively, allow a minute decision in x+C if and only if `firstTradeAfterDecision` returns −1. Choose one.

### 13. [MINOR] PROTOCOL §12 `audit` (data QA, "data metadata" manifest), §1 item 6: helper summaries
**Problem.**
- `data/VGT/` also holds `dataset-report.json` and `partition-report.json`, whose names suggest whole-file summaries that would include 2024–2026. The session's `sha256sum data/VGT/*` hashed them too, but §1.6 mentions only the CSV.
- `config/market-events/distributions.csv` holds VGT distributions to 2026.
- `config/market-events/splits.json` holds VGT's 2026 8:1 split, and `selectRunSessions` calls `readSplits()`.

**Fix.**
- Enumerate the manifest's files and hash the data metadata as opaque bytes (never parse, print or quote it).
- Restrict data QA to the bounded loaded dataset.
- Disclose the glob hash.
- Bar Stage 1c code from reading `distributions.csv`.
- Assert `splitAdjustments = 0` and disclose that `splits.json` is read.

### 14. [MINOR] PROTOCOL §2 per-stage doors: in-process caches and workers
**Problem.** Stage 1b `data.ts` keeps a module-level cache keyed by end, and workers receive datasets. A develop-A process holding a later-end dataset (through a helper, a cached H, or a reused worker) would break fold A's door without any assert firing, because `assertDoor` checks only the dataset passed to it.

**Fix.** "Each develop/parity stage runs in a fresh process that calls the loader once with its door end; a later-end call in the same process is refused (fail closed); workers receive only that dataset and assert ds.lastDate ≤ the stage door before each run."

### 15. [NOTE] Loader bound (end + 2 UTC days, inherited from `loadBounded`)
For a generic Monday–Thursday end this bound keeps the next session's rows. It is safe for the five Stage 1c ends only because each one (2019-12-31, 2020-12-31, 2021-12-31, 2022-12-30, 2023-12-29) is followed by a holiday or weekend. Assert that per end, or use (end+1)T05:00Z, after which every row has an NY date later than the end.

### 16. [NOTE] "Rules off = bit-identical" (ENGINE_CONTRACT §1–§10)
The insertion points fit Stage 1b's loop: step 2b runs only when A is due; B/C filter after the choice and on the minute fire; R writes have no reader when no rule is set; the new trade fields are not in `pathHash`. Residual conditions to state and test:
- (a) Finding 5.
- (b) In high mode the own condition is evaluated before the reference is raised.
- (c) `trimBar` is unchanged when A is not due.
- (d) Mask-000 Stage 1c policies carry `|-` keys, so their ids differ from Stage 1b ids. Parity (a) should run both forms and compare everything except id strings (transition `detail` contains ids).
- (e) A rule that is present but inert must also be bit-identical. Test N = 60 on a tight trail, C on a path with only profitable exits, and X = 0.15 with no such losses.

### 17. [NOTE] ENGINE_CONTRACT §13 / PROTOCOL §8.1: policy identity includes `protect`
Consecutive picks that differ only in rule parameters are different policies. S1 therefore sells at b+1 (and re-buys if the signal holds), paying friction and restarting A's clock. State that this is deliberate and report how many Π1 boundaries are of this kind.

### 18. [NOTE] Loss-record blind spots and the flat start
- Transition and conversion exits never write R.
- S3 re-bases E and L at the conversion price, so A, B and C all lose sight of a loss from before the boundary. Disclose this for Π1-S3.
- The executable account starts at 2019-12-31 with R = none, so a December-2019 losing exit from the fold-A development run is not carried. That is consistent with the flat start, but should be disclosed.

### 19. [NOTE] PROTOCOL §5 preflight: C is largely inert on R3F re-entries
R3F already requires C_s > stoppedHigh = Hc ≥ E ≥ exitRaw/(1−X). C can therefore bind on an R3F re-entry only when Y exceeds roughly X/(1−X). It acts mostly on event-family fresh re-entries and on first entries after a campaign has died. Report that region and each cell's share of inert (X, Y) vectors, so that inertness is not read as robustness.

### 20. [NOTE] PROTOCOL §12 parity (b): reference independence
"From ENGINE_CONTRACT.md only" in practice requires Stage 1b's contract and A1, which it incorporates by reference. State whether the reference may reuse Stage 1b's `reference.ts` for §1–§10; if it does, independence covers only §11–§14.

### 21. [NOTE] ENGINE_CONTRACT §11.5: netOpen applies openSlip in mode `next`, whose fill is not an opening fill
This is defensible as the "hypothetical liquidation at the open". The consequence is that under the 50 bps opening-slippage stress A's trigger moves but its fill does not. Declare this deliberately.

### 22. [NOTE] Embargo labels
`data/partitions.json` defines holdout as 2024-01-01 → 2025-10-16 and final as 2025-10-17 → open. The protocol's "2024–2025 validation / 2026 final holdout" should cite the repository's actual partition boundaries.

---

### Overall assessment
The core execution design holds up:
- **Rule A:** the primary mode (decide on the observed opening trade, fill at the next trade) is causal and matches D1 for opening fills. It has a single, fixed fill path: stop gap at the open, then stop in minute 0, then A. It never exits twice and never charges interest twice.
- **Rules B and C:** they are pure, look-ahead-free filters on entry decisions, and the order in which they are applied cannot change the fill path.
- **Engine changes:** the insertion points into the Stage 1b engine can plausibly keep the rules-off path bit-identical.

The problems are elsewhere:
- **Data embargo:** this is the weakest part. The planned `npm test` in `audit` would run D1, B4/B5 and allocator code on VGT `all` data through 2025–2026 (blocker). The bounded-loader claim cannot be met with a csv-parse streaming design, and the plan would write a post-door timestamp into a sealed record.
- **Rule B:** it reads a stale loss record across policy switches, which affects the verdict path itself.
- **Timer-release buys:** for E09, and for state-like conditions generally, the cooldown releases what is effectively a queued buy, against the brief's explicit guard.
- **Contract gaps:** several points (side effects of a discarded decision, the timing and scope of `reset`, the C-cross state) would make a reference written from the contract diverge from the fast engine. Parity would then fail, which the rubric classes as "Invalid".

All of these can be fixed with wording or small mechanical changes before the freeze, and none needs a redesign. A–D-fold results should not be produced until findings 1–6 are fixed and the fixes are recorded with their dispositions.
