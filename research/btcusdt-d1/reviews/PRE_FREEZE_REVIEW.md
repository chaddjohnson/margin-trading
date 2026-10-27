# Independent pre-freeze review — BTCUSDT spot D1 study

**Reviewer:** independent read-only subagent. **Written:** 2026-10-27T00:46Z (UTC).
**Scope:** design, causality, D1 fidelity, accounting, reference/fast parity, selection and gate logic, data doors,
records, isolation and data handling. The review took place before `PROTOCOL_FREEZE.json` existed and before any
optimisation outcome. No outcome stage was run, and no strategy was evaluated on the real BTC data or the cache.
`PARITY.json` was read for counts only.

**Commands run:**
- the BTC unit tests (29/29 pass, Node v24.21.0);
- `npm run btc-d1 -- chronology`;
- `npm run btc-d1 -- data-audit` (MATCHES the sealed audit);
- synthetic-fixture probes in a scratch directory outside the repository (appendices).

**Code state reviewed (2026-10-27T00:43Z):**
- Code manifest: 29 files, digest `bdfa0a2a…`. It differs from PARITY.json's manifest (`1fcd7f63…`, 28 files) only in
  `protocol.ts` (the budgets) and the new `tables.ts`. The engine closure is the code that parity tested.
- `engine.ts` `ff8e61a5…`, `fast.ts` `209f3abf…`, `evaluate.ts` `329dc6ae…`, `select.ts` `075c6001…`,
  `stages.ts` `d0355e35…`, `records.ts` `6f69cbd8…`, `cli.ts` `74ce9b35…`, `protocol.ts` `76c9d403…`.
- `PROTOCOL.md` `a8c59917…`, `BTC_CLOCK_AND_EXECUTION.md` `4a89bc6a…`.
- Files were still being added during the review (`tables.ts` at 00:28Z, `ENGINE_PARITY_AND_TESTS.md`). Anything
  changed after 00:44Z is not covered.

## Verdict

**Must fix first. There is no blocker-level defect.** I found no causality, lookahead, accounting or engine-parity
defect:
- Both engines implement D1's rules faithfully on the UTC clock.
- Every decision is taken at a completed minute, and fills happen at the next traded minute.
- Rolling highs, stops and continuation highs change only after a day ends.
- Selections are physically sliced at their cutoff, and the holdout stage needs a passing sealed gate.
- The reference and fast engines agreed exactly on eight extra synthetic edge cases: whole missing UTC days while
  long, armed, pending and inside a continuation window; windows opening while long; a carried buffered sale meeting
  a gap; a single-bar hold day.

The problems are in what the freeze would lock in. Each one is cheap to fix now and impossible to fix legitimately
after the freeze:
1. **The procedure gate is weak.** The gate that opens the holdout is much weaker than the selection gates. It can
   pass on two trades at the principal costs alone (M1).
2. **G5 does not bound anything.** Its "worst-case" stop fill is not a lower bound on the principal fill (demonstrated,
   M2).
3. **The shortlist can be monopolised.** It is ranked by raw net only, so it can starve the protected family slots
   (M3).
4. **Several brief §6 gate items are unaddressed.** They are neither gated nor declared report-only (M4).
5. **PROTOCOL §4 contradicts itself.** Its fold rule text contradicts its own dates (M5).
6. **The freeze does not check parity freshness.** It does not verify that PARITY.json tested the code being frozen,
   and the CLI cannot write a labelled parity rerun (M6).
7. **The amendment path is too loose.** One unsealed line can admit any code change, and no outcome record states
   the code it ran under (M7).
8. **The data door trusts editable files.** `fixed`/`compare` trust the door field of an unsealed phenotype JSON (M8).

If M2 (or m1) is fixed in the engines, parity must be re-run before freezing (M6). For each major finding, the
coordinator may instead decline the fix with a documented reason in PROTOCOL.md. A silent freeze is not acceptable.

## Findings (ranked)

Severity: **blocker** = invalidates the study if frozen; **major** = should be fixed (or explicitly waived in the
protocol) before the freeze; **minor** = fix or document; **note** = informational.

| # | Sev. | Where | What is wrong | Concrete failure scenario | Recommended fix |
|---|---|---|---|---|---|
| M1 | major | `protocol.ts:48-49`; `stages.ts:585-596, 706-711`; `PROTOCOL.md:145-146` | The fold gate opens the holdout but only requires rank-1 validation net > 0 at the principal costs, minute DD ≤ 35% and ≥ 2 entries over 455/488 days. None of the selection gates apply out of sample: G2 concentration, G4 conservative costs, G5 worst fill, and the ≥ 3 trades/year rate (which would be 4 and 5 entries here). The conservative, `low` and cost-grid results are all computed (`outOfSampleEvidence`) and then ignored. Validation net includes the incremental mark of a carried-in position. Validation DD % is measured against an equity base inflated by selection-period profit while notional stays capped at 100,000 USDT, so the 35% ceiling loosens the more the pick made earlier. | The rank-1 pick starts fold A validation with 230,000 USDT of equity and makes two trades (+9,000, −6,000). It passes with net +3,000, although its net is < 0 at 20+10 bps or with `low` fills. A 75,000 USDT drawdown (75% of the maximum notional, twice the user's 35,000-per-100,000 reference) is 32.6% of that equity and passes. | Preregister the out-of-sample gate as the selection gates applied to the validation window: net > 0 at the principal costs and at the conservative costs and with the worst-fill convention; entries ≥ ⌈3 × validation years⌉; net minus the largest trade net > 0; minute DD ≤ 35%. Because notional is capped at 100,000, also require minute DD ≤ 35,000 USDT. Apply the same rule to the holdout gate. |
| M2 | major | `engine.ts:629-645`; `fast.ts:458-469`; `costs.ts:13-18`; `PROTOCOL.md:50-53, 124-126`; `BTC_CLOCK_AND_EXECUTION.md:98, 103-106` | `low` fills at the trigger minute's low; the principal `adverse` fills at min(stop, next traded minute's open). When the next minute opens below the trigger low, which is common in a cascade, `adverse` is worse than `low`. So G5 ("net > 0 with worst-case low fills") is not a lower bound and can pass while being more optimistic than the principal on exactly the trades that matter. `adverse` also fills exactly at the stop whenever the next open recovers above it, however far below the stop the trigger minute traded. That is the ETF's stop-price assumption, which brief §4 says not to inherit for V-shaped minutes. G5 is meant to guard against this and does not. | Demonstrated (appendix A): stop 99.75, trigger low 99, next open 95. `adverse` exits at 95 for net 4,082.89 USDT; `low` exits at 99 for net 8,465.32 USDT. | Define the worst-fill sensitivity as **min(stop, trigger low, next traded open)**, recorded where its last price is observed. That is a true lower bound on every convention. Keep `stop` as the optimistic bound. Correct the "worst-case" and "bounds the damage" wording. This is an engine change, so rerun parity (M6). |
| M3 | major | `select.ts:159-178, 222-240`; `PROTOCOL.md:121-131` | Diversity is enforced for the refinement seeds and for the picks. But every pick is drawn from a 60-vector shortlist that is the top 60 by raw net, after exact-signature de-duplication only. The 3,072 refinement offspring are hill-climbed variants of at most 8 seeds. Variants whose exits differ by one minute have different signatures and survive de-duplication. The shortlist can therefore be one or two lineages, and the "three protected family slots" yield one or two picks whatever the Sobol design found. This is the seeded-arm monopoly the brief warns about, moved from the budget to the shortlist. | Seed 1's lineage holds ranks 1–45 and seed 2's holds ranks 46–60. A diverse, robust Sobol family at rank 61 is never robustness-tested; families produce at most 2 picks. | Build the shortlist with a near-duplicate rule on the same distance, e.g. a vector joins only if its exposure-day distance from every shortlisted vector is ≥ 0.1–0.2. Alternatively, reserve shortlist quotas per lineage (each seed lineage plus the Sobol-only pool). Preregister the rule now. |
| M4 | major | `PROTOCOL.md:110-131, 135-146`; `protocol.ts:37-49` | Brief §6 lists these items for "objectives and gates": daily DD, absolute (USDT) DD, the distribution of trades, and performance across non-overlapping subperiods. The protocol gates none of them. Subperiod performance appears only as descriptive validation attribution; daily and USDT DD are only reported. A frozen protocol that is silent on them invites post-hoc treatment. | A pick whose entire selection net comes from one year passes G1–G5. After results are seen, "it lost in 3 of 4 years" has no preregistered consequence. | Either add the gates, or state in §7 that each item is report-only and why. For example: a subperiod gate (selection window cut into calendar years or thirds; net > 0 in ≥ 2 of 3, or no subperiod > X% of net) and an absolute ceiling of 35,000 USDT on minute DD (the user's own reference). |
| M5 | major | `PROTOCOL.md:71-75`; `calendar.ts:63-66` | The table defines Development as 2019-02-11 → 2024-07-01 (1,967 days) and places the folds at the "month start ≤ 60% / 80% of development". Read literally, that rule gives fold starts of 2022-05-01 and 2023-06-01. The code, and the dates in the table (2021-12-01 / 2023-03-01), use 60% / 80% of holdout start − history start = 2,332 days, i.e. the warm-up year is included. | An auditor who applies the frozen text gets different folds and concludes the split did not follow its preregistered rule. | Reword the rule and keep the dates: "the month start containing day historyStart + ⌊0.6 × (holdoutStart − historyStart)⌋ (2,332 days, warm-up included)", and likewise for 0.8. `calendar.ts` (`35e5b26e…`) is unchanged since before the diagnostic run (RESEARCH_RECOVERY §4), so the code's dates are the outcome-blind ones; changing them now would not be. |
| M6 | major | `stages.ts:289-330` (`runFreezeStage`); `records.ts:39-51`; `RESEARCH_RECOVERY.md:19-22` | The freeze checks that PARITY.json exists and verifies, but not that the code parity tested is the code being frozen. Today only `protocol.ts` and `tables.ts` differ, which is fine. But any fix to `engine`/`fast`/`evaluate`/`calendar`/`costs`/`params`/`snapshot` made in response to this review would be frozen alongside a stale parity record. `parity` can be written only once, so a labelled rerun requires hand-run code, as the checkpoint itself notes. | M2 is fixed in `engine.ts` and `fast.ts`, then `freeze` succeeds. The frozen study has no evidence that the new fast path matches the reference. | Add `parity --rerun N`, writing `PARITY-N.json` (labelled rerun, same seeds). Make `freeze` require that the latest parity record's hashes equal the current files for the whole engine closure: all non-test files except `cli`, `report`, `tables`, `phenotypes`, `protocol`. Record in the freeze which parity record it relies on. |
| M7 | major | `records.ts:123-171` (`readAmendments`, `assertFrozen`); `stages.ts:364-405, 598-607, 624-630, 700-712` | `assertFrozen` accepts any code whose digest equals the last line of `AMENDMENTS.jsonl`. That file is unsealed, unchained and unvalidated: no reason, file list or time is required. SELECTION, PICKS, VALIDATION, PROCEDURE_GATE and HOLDOUT do not record the code digest, procedure hash or freeze body hash they ran under. Report-only code added after the freeze (as `tables.ts` just was) forces this path, so it will be used routinely. | After fold A, `fast.ts` is edited and one line with the new digest is appended. Fold B and the final selection then run under different engine semantics, and nothing in the sealed records shows it. | Write `freezeBodyHash`, `codeDigest`, `procedureHash` and the amendment head into every outcome record. Make amendments sealed and hash-chained (previous hash, files changed, reason, UTC time, last outcome record so far). Split the manifest into an **outcome-critical** set that no amendment may change once any outcome record exists, and a **reporting** set that may change with an amendment. Outcome-critical: `engine`, `fast`, `evaluate`, `select`, `space`, `params`, `costs`, `calendar`, `snapshot`, `raw`, `protocol`, `records`, `stages`, `pool`, `worker`, `context`, and the optimizer `rng`/`sobol`. Reporting: `cli`, `report`, `tables`, `phenotypes`, tests. |
| M8 | major | `cli.ts:273-304, 332-341, 380-397`; `phenotypes.ts:44-69` | `fixed`/`compare` take `latestPermittedDay` from `config/research-phenotypes/btcusdt-d1/<id>.json` without checking it against sealed records. Any JSON in that folder with a valid id, study and grid is runnable. `verify` checks the doors, but `fixed` never runs that check. | Copy `final-r1.json` to `final-r1b.json` and set `"latestPermittedDay": "2026-08-24"`. `fixed final-r1b --dataset all` then evaluates the sealed holdout without a passing gate. A hand edit of an existing door does the same. | In `fixed`/`compare`, derive the door from the sealed records: gate pass + HOLDOUT.json + membership in the final PICKS. Accept only ids that can be derived from those records, with a grid equal to their PICKS entry (and, for the diagnostic, equal to `diagnosticGrid`). Use the JSON's door field for display only. |
| m1 | minor | `engine.ts:636-640`; `fast.ts:464-469`; `PROTOCOL.md:51-53` | `adverse` with the trigger on the UTC day's last traded minute fills at min(stop, trigger close), recorded in the trigger minute. That is not the next causally eligible trade (the next day's first open), and the buffered sale does carry over in the same situation. The rule uses the knowledge that no further bar exists that day. Across an outage spanning midnight, it books a price the order could not have got. | Appendix A: trigger at 23:59, next trade 10% lower; the exit is booked at 99.6. On this data such outages are rare (they are early-UTC maintenance windows), and a 23:59 trigger is about 1/1440 of stop triggers. | Fill at min(stop, next day's first open), as the buffered sale does, or document it as a limitation. This is an engine change (M6). |
| m2 | minor | `engine.ts:601-609`; `fast.ts:416-425`; `BTC_CLOCK_AND_EXECUTION.md:52, 99` | When the maximum hold is due on a day with a single bar, there is no exit that day; it is re-evaluated the next day. The engines agree (appendix B). The ETF would have used the closing print, and this is undocumented. | — (no 1-bar days in history). | Document it in BTC_CLOCK §3/§5. |
| m3 | minor | `raw.ts:115-120` | An empty field (`digits = 0`) falls back to `Number('')` = 0 and the line is **not** reported as malformed. A leading space is silently accepted. | An empty trades field would turn a bar into a dropped "zero-trade" row, and an empty volume would become 0. No effect on this file: 0 malformed lines, and every zero-trade row is flat with zero volume. Shown in appendix A. | Treat `digits === 0` (and any non-numeric byte) as malformed. |
| m4 | minor | `snapshot.ts:106-122, 186-195`; `cli.ts:61-81, 599-603`; `DATA_AUDIT.md:76, 88` | The snapshot is not pinned to its sealed definition. (a) `historyStart` is derived from irregular rows **after** the snapshot end as well. (b) `snapshot` rebuilds from the current raw file and overwrites the cache. (c) `data-audit` recomputes from the whole current file, so it fails as soon as rows are appended, contradicting DATA_AUDIT §3. Outcome stages fail closed on the series hash, so nothing changes silently. | Appendix A: one irregular row in the partial last day moves `historyStart` past the end, leaving 0 canonical rows. Once the file is appended, `data-audit` refuses and `snapshot` produces a different series and chronology. | Rebuild from the sealed `snapshotPrefixBytes`/`snapshotEnd`. Restrict the irregular-row rule to rows before `snapshotEnd`. Make `data-audit` verify the prefix part. Refuse to overwrite a cache whose hash differs from the sealed one. |
| m5 | minor | `snapshot.ts:102`; `DATA_AUDIT.md:72` | "The end of the file's last complete UTC day" is implemented as "the start of the last row's day", which drops a complete last day. | A file ending at 23:59 loses its last day (appendix A). No effect on this file, which ends at 09:33. | Reword, or test completeness. |
| m6 | minor | `fast.ts:431` (skip); `snapshot.ts` (no check) | The fast path skips the stop search when the day's low is above the stop, while the reference also triggers on open ≤ stop. They are equal only if low ≤ open in every bar. The audit counts 0 violations, but nothing enforces it, and the series hash pins the data, not the invariant. | A bar with open ≤ stop < low (invalid OHLC) exits in the reference only, breaking parity. | Assert low ≤ min(open, close) ≤ max(open, close) ≤ high for every canonical bar in `defineSnapshot`/`loadSnapshot` (fail closed). |
| m7 | minor | `stages.ts:364-405, 517-526`; `records.ts:68-80` | The archive, SELECTION and PICKS are written as three separate write-once files. A crash between them leaves a state where a rerun throws ("archive exists"), and recovery would need a sealed file to be deleted. | The process is killed after `archive.jsonl.gz` is written. | Write to temp files and rename, PICKS last, or resume when matching archive/SELECTION records exist. Record the resume semantics in the checkpoint. |
| m8 | minor | `stages.ts:658-716` | A passing procedure gate with **no** final picks still writes HOLDOUT.json with empty evidence ("evaluated once"). | Both folds pass, but the final selection finds no G1–G5 vector. | Refuse, or seal "no final pick: holdout not opened". |
| m9 | minor | `stages.ts:613-631`; `cli.ts:504-535` | The gate does not check `VALIDATION.picksBodyHash` against PICKS.json. `verify` accepts `holdoutEvaluated: true` on any phenotype id once the gate passed and HOLDOUT exists, and never checks the diagnostic's grid. | — | Add the cross-record checks. |
| m10 | minor | `cli.ts:392-397`; `cli.ts:284-297, 343-350` | `compare` silently drops `--dataset all` instead of refusing it as brief §9 requires. `fixed --dataset fold-a-validation` arms from the validation start (a flat start), so its numbers differ from VALIDATION.json's continuous run without saying so. | A user compares `fixed` output with the sealed validation and finds a mismatch. | Refuse in `compare`. Label the run as a flat start, or run it continuously with a window. |
| m11 | minor | `report.ts:287-291` | `--out` blocks only `research/`. `--out data/BTCUSDT` or `--out config/research-phenotypes/btcusdt-d1` write report files there; the latter breaks `list`/`verify`. | — | Restrict output to `evaluations/btcusdt-d1/`. |
| m12 | minor | `cli.ts:115-121, 210-240`; `phenotypes.ts:114-130` | If `phenotypes` runs after a passing gate but before `holdout`, the final phenotypes get the sealed door. After the holdout, rewriting them throws "different content". | — | Refuse `phenotypes` when the gate passed and HOLDOUT.json is absent. |
| m13 | minor | `stages.ts:123-124`; `ENGINE_PARITY_AND_TESTS.md:28-29` | The `gapFills` coverage counter uses `> 60`, but a fill after one missing minute has entryTime − decisionTime = 60 (`engine.test.ts:141`), so single-gap fills go uncounted. `crossMidnightHolds` is trivially every closed trade, since there are no same-day exits by construction. The report's "missing-minute fills did not occur" is therefore not established. `carriedSales` = 0 on the real data, so that path is fixture-only. | — | Use `> 0`, and replace the midnight counter. |
| m14 | minor | `mutation.ts:124-133`; PARITY `cheat 1/24` | The only deliberate cheat (reading the next minute's low) is caught at just 1 of 24 real-data cutoffs, and no mutation ever changes bar times. | — | Add cheats: the current day's high in the reference high, an intraday stop update, a fill at the decision close. Add a bar-deletion/truncation mutation. |
| m15 | minor | `PROTOCOL.md:115`; `evaluate.ts:76-77` | G2 is worded "net minus the two largest trade nets", but the code subtracts the two largest **positive** nets. | Trades [+5,000, −100, −100]: the text could be read as subtracting −100. | Fix the wording. |
| m16 | minor | `records.ts:134-171` | The freeze binds PROTOCOL.md but not BTC_CLOCK_AND_EXECUTION.md (to which §3 delegates the semantics) or DATA_AUDIT.md. `environment()` (the btc-d1 script, lockfile) is recorded but never checked. | — | Hash the two documents in the freeze and check them. |
| m17 | minor | `DATA_AUDIT.md:61-66`; `costs.ts` | The study's own audit says the 5 bps principal impact is optimistic for 2018–2019, when 100,000 USDT was about a minute's whole volume. Every selection window starts in 2019, and capacity is only warned about. | — | Consider a participation-scaled impact in G4, or a preregistered capacity flag on picks. |
| m18 | minor | `tests/*.test.ts` | The suite has no case for whole missing UTC days (long, armed, pending, inside a continuation window), a carried buffered sale meeting a gap, windows opening while long, a single-bar hold day, or "an arming closes the continuation window". | — | Add the appendix B probes (they pass on both engines) to the suite. |
| m19 | minor | `RESEARCH_RECOVERY.md:66-70` | The "params.ts reformatted, whitespace only" claim cannot be checked: the pre-diagnostic version (`663bbbb9…`) is not on disk; the current file is `2d9adf54…`. | — | Keep a copy or diff of the original in the study directory. |
| n1 | note | `PROTOCOL.md:176-182` | The diagnostic's development-span result (105 trades, +89,223 USDT, 65.7% DD) was seen before the gates were written to disk. This is disclosed. `calendar.ts` and `costs.ts` are byte-identical to their pre-diagnostic hashes. | — | Keep the disclosure, and keep the fold dates (M5). |
| n2 | note | engines (marks) | With a non-compounding 100,000 USDT cap, DD % falls as equity grows, so a percentage alone is not comparable across candidates or windows. G1 net also includes the open position's mark at the cutoff. | — | Report USDT DD next to DD % everywhere (see M1/M4). |
| n3 | note | `records.ts` | Sealed records are integrity hashes, not authentication: anyone can re-hash a forged body. This is the repository's convention. | — | — |
| n4 | note | `DATA_AUDIT.md:51-52, 61-62` | The audit discloses non-price facts about the holdout: no missing minutes after 2024-07-01, and the largest-volume and most-traded minutes are in 2024-12 and 2025-10. None of the audit's 60 listed price outliers falls in the holdout (checked). This is not an engine read. | — | — |
| n5 | note | misc. | `audit.ts:3` refers to a nonexistent `./split.ts` (the rule lives in `calendar.ts`). In BTC_CLOCK §3.1, "fill price" means the observed open, before impact. `results/logs/` and `results/baseline/npm-test.log` are git-ignored although the checkpoint cites them. | — | Wording only. |

## Checked and found correct

1. **Causality (reference engine).**
   - Arming and the rebound are tested on each completed minute (`engine.ts:495-572`).
   - The reference high spans days d−L … d−1 (`489-493`).
   - A buy fills at `bars[k+1]` or the next day's `bars[0]` (`564-569, 484-487`); missing minutes never create a fill.
   - The entry-day post-entry high covers the fill minute onward plus the close and the observed fill price, and is
     used only from the next day (`575-585`).
   - The stop update and the continuation high and expiry happen after the day (`703-718`).
   - The day aggregates in `buildDays` are read only after their day.
   - Synthetic and real-data mutation checks: 0 violations.
2. **Causality (fast replay).** It follows the same order (`fast.ts:321-506`). Its three skips are exact: the
   arming tests are monotone in the close, the window high is constant within a day, `netAt` is monotone in price,
   and a stop trigger is equivalent to day low ≤ stop provided OHLC is valid (m6).
3. **Data door of the stages.**
   - `Evaluator.run` slices at max(window end, `dataEndDay`) (`evaluate.ts:145-170`).
   - Selection requests carry no `dataEndDay` (`select.ts:80-85`), so the fold A/B and final selections see only bars
     before 2021-12-01, 2023-03-01 and 2024-07-01.
   - Validation runs are continuous from 2019-02-11, sliced at the validation end, with incremental window metrics
     (`stages.ts:440-458`).
   - `final` requires the sealed gate record; `holdout` requires `gate.pass` and runs only the sealed final picks,
     once (`stages.ts:637-675`).
   - Parity and the benchmark used development data only.
4. **D1 fidelity, rule by rule** (ETF `src/app/allIn-trailingBuy-postExitContinuation.ts` → BTC `engine.ts`):
   - deep arming before continuation (ETF 804-818 → 503-513), and any arming closes the window (850 → 529);
   - the arming minute never buys, the trailing low starts at its close, and each minute lowers the low before testing
     the trigger (859-868 → 538-547);
   - entries only on days that start flat, exits only on days that start long (788/984 → 474/483/586);
   - a pending order fills at the next day's opening trade (789-793 → 484-487);
   - the stop's activity is decided before the day, net of costs (199 → 590), and the gap at the open comes first
     (206-216 → 594-597);
   - a carried buffered sale goes after the gap and before the maximum hold (307-320 → 598-600);
   - the maximum hold sells at the next trade after the opening trade (220-224 → 601-609);
   - the buffer applies from the hold day only when the maximum hold is not due (323-325 → 612-613);
   - stop-vs-buffer precedence matches, including the stop winning at the minute after the signal when that minute
     opens through the stop (338-346 → 611-618);
   - the post-entry high and the stop never move down (1080-1082 → 703-707);
   - a profitable exit opens the window at the exit price; its high comes from later days and it expires after W days
     (1022-1027 / 1111-1120 → 453-455 / 709-718).

   Every difference is a documented BTC adaptation: UTC calendar days; a uniform arming start of history + 365;
   profit tests net of both sides' fees and impact; cash sizing; the 10 USDT floor; the stop-fill convention; no
   closing print.
5. **Accounting.**
   - Sizing is min(100,000, cash/(1+fee)) (`engine.ts:461-471`, `fast.ts:368`), so the cap is never exceeded and the
     fee is always funded; cash ≥ −1e-6 is asserted (`349-351`).
   - Fees and impact are computed exactly (`336-347, 413-421`; checked by hand in the tests).
   - Marks use liquidation value (`333-334, 667-701`).
   - The USDT and peak-to-trough % trackers start from the window's start equity (`193-222`, `fast.ts:179-211`), and
     window net is start-to-end marked equity minus top-ups (`782`).
   - An open position at the end is marked, never given an invented exit (`742-763`), and fixed-mode top-ups are
     tracked (`342-345, 462-466`).
   - `reconcileLedger` checks are complete (`parity.ts:112-151`).
6. **Parity.** `compareRuns` covers trades, windows, signals and setup counts. My eight extra probes (appendix B) are
   exactly equal under all three stop conventions with 10/5 costs; the real-data record has 205 runs and 0
   differences.
7. **Selection code matches §7.**
   - Budgets and G1 minimum entries of 9 / 13 / 17 (⌈3 × days/365.25⌉).
   - G1–G5 as written, apart from the G2 wording (m15).
   - Seeds taken by distance from every earlier seed, with equal per-seed budgets and RNG labelled by window, seed and
     generation.
   - Exact-signature de-duplication, a shortlist of 60, radius-1/2 joint neighbours with reflection, and score = the
     median radius-1 neighbour net.
   - Families promoted by distance from **every** pick, and the exploratory ≤ 25% class.
   - Ordering is deterministic (ties broken by key), and pool results come back in request order whatever the worker
     count.
8. **Records.** `writeSealed`/`writeArchive` use `flag: 'wx'`, and `readSealed` verifies `bodyHash`. Fold
   VALIDATION, final PICKS and HOLDOUT reruns are refused before any computation. `assertFrozen` binds exactly what
   PROTOCOL §10 lists (with the M7 caveat).
9. **Isolation.**
   - `git status --short` shows ` M package.json`, `?? research/btcusdt-d1/` and `?? src/btcusdt-d1/`.
   - The package.json diff adds one `btc-d1` script line. The `pools` script and the imports map are unchanged, and
     `package-lock.json` sha256 `ee4c73e3…` equals the prospective freeze's value.
   - The prospective freeze's bound code files are unchanged against HEAD; its `src/lib/calendar.ts` entry is an
     append-only binding and equals HEAD.
   - The BTC code imports nothing outside its namespace except `src/optimizer/rng.ts` and `src/optimizer/sobol.ts`.
10. **Data.**
    - On the exact parse path, the raw parser's conversion equals `Number()` on awkward decimals (appendix A).
    - No write site targets `data/`; the raw file's mtime (2026-10-20) predates the study.
    - The `data-audit` recompute MATCHES the sealed audit, and `chronology` reproduces PROTOCOL §4's dates (holdout
      2024-07-01 → 2026-08-25, 785 days = 25.2%).
    - The snapshot constants (history start 2018-02-11, end 2026-08-25, 329 zero-trade rows dropped, 4,482,236 bars)
      are consistent with the sealed audit.

## Appendix A — synthetic tests demonstrating defects (M2, m1, m3, m4, m5)

These run from the repository root with
`node --experimental-transform-types --disable-warning=ExperimentalWarning --test <file>`. They import the study's
modules by absolute path, use synthetic bars or files only, and live outside the repository in the reviewer's scratch
directory.

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
const R = '/Users/chad/development/personal/margin-trading/src/btcusdt-d1';
const { makeSeries, flat, baseParams, settingsOf, at } = await import(`${R}/tests/fixtures.ts`);
const { buildDays, runReference } = await import(`${R}/engine.ts`);
const { runFast } = await import(`${R}/fast.ts`);
const { dayIndexOf, dayOf } = await import(`${R}/calendar.ts`);
const { compareRuns } = await import(`${R}/parity.ts`);
const { parseRawFile } = await import(`${R}/raw.ts`);
const { defineSnapshot } = await import(`${R}/snapshot.ts`);

const both = (bars: any[], armDate: string, settings = settingsOf(10, 5)) => {
  const series = makeSeries(bars);
  const armStartDay = dayOf(at(`${armDate}T00:00`));
  const w = [{ label: 'all', startDay: armStartDay, endDay: dayOf(series.time[series.rows - 1]) + 1 }];
  const reference = runReference({ days: buildDays(series), params: baseParams, settings, armStartDay, windows: w });
  const fast = runFast({ series, index: dayIndexOf(series), params: baseParams, settings, armStartDay, windows: w });
  return { reference, parity: compareRuns(reference, fast) };
};
// Deep entry 2024-01-03 at 91; post-entry high 105; stop 99.75 (active) from 2024-01-04.
const entry = (): any[] => [
  flat('2024-01-01', 100), flat('2024-01-02', 100),
  ['2024-01-03T00:00', 100, 100, 99, 99], ['2024-01-03T00:01', 99, 99, 89, 89],
  ['2024-01-03T00:02', 89, 89, 88, 88.5], ['2024-01-03T00:03', 88.5, 90, 88.5, 90],
  ['2024-01-03T00:05', 91, 92, 90.5, 92], ['2024-01-03T00:06', 92, 105, 92, 104]
];

test('M2: "low" is not a lower bound of "adverse"', () => {
  const bars = [...entry(),
    ['2024-01-04T00:00', 104, 104, 101, 101],
    ['2024-01-04T00:01', 101, 101, 99, 99.2], // trigger: low 99 <= 99.75
    ['2024-01-04T00:02', 95, 96, 94, 95]];    // the next minute opens at 95, below the trigger low
  const adverse = both(bars, '2024-01-03', settingsOf(10, 5, 'adverse')).reference.trades[0];
  const low = both(bars, '2024-01-03', settingsOf(10, 5, 'low')).reference.trades[0];
  // observed: adverse 95 net 4082.89; low 99 net 8465.32
  assert.ok(low.netPnl > adverse.netPnl);
});

test('m1: an adverse stop on the day’s last minute books min(stop, that close), not the next trade', () => {
  const bars = [...entry(),
    ['2024-01-04T00:00', 104, 104, 101, 101],
    ['2024-01-04T23:59', 101, 101, 99, 99.6], // trades through 99.75 on the day's last minute
    ['2024-01-05T00:00', 90, 90, 90, 90], ['2024-01-05T00:01', 90, 90, 90, 90]];
  const r = both(bars, '2024-01-03', settingsOf(10, 5, 'adverse'));
  assert.deepEqual(r.parity.differences, []);
  assert.equal(r.reference.trades[0].exitPrice, 99.6); // the next eligible trade was 90
});

const line = (t: number, o: string, h: string, l: string, c: string) => `${t}|${o}|${h}|${l}|${c}|1.5|100.25|0.5|150.75|5`;
const dir = path.dirname(new URL(import.meta.url).pathname);

test('m3: an empty field parses as 0 and is not reported as malformed', () => {
  const file = path.join(dir, 'raw-b.csv');
  fs.writeFileSync(file, [line(1700000000, '1', '1', '1', '1'), '1700000060|1||1|1|1|1|1|1|1'].join('\n') + '\n');
  const raw = parseRawFile(file);
  assert.equal(raw.malformed.length, 0);   // observed: line 2 not flagged
  assert.equal(raw.columns.high[1], 0);    // the empty high became 0
});

test('m4: an irregular row after the snapshot end moves the history start past the end', () => {
  const day = 86400, t0 = 19700 * day, rows: string[] = [];
  for (let d = 0; d < 5; d++) for (let m = 0; m < 3; m++) rows.push(line(t0 + d * day + m * 60, '10', '10', '10', '10'));
  rows.push(line(t0 + 5 * day + 30, '10', '10', '10', '10')); // partial last day, :30 s
  const file = path.join(dir, 'raw-c.csv');
  fs.writeFileSync(file, rows.join('\n') + '\n');
  const { definition, series } = defineSnapshot(parseRawFile(file));
  assert.equal((definition.historyStart - t0) / day, 6); // after the snapshot end (day 5)
  assert.equal(series.rows, 0);
});

test('m5: a file ending at 23:59 loses its complete last day', () => {
  const day = 86400, t0 = 19700 * day, rows: string[] = [];
  for (let d = 0; d < 3; d++) for (let m = 0; m < 1440; m++) rows.push(line(t0 + d * day + m * 60, '10', '10', '10', '10'));
  const file = path.join(dir, 'raw-d.csv');
  fs.writeFileSync(file, rows.join('\n') + '\n');
  assert.equal((defineSnapshot(parseRawFile(file)).definition.snapshotEnd - t0) / day, 2); // day 2 was complete
});
```

## Appendix B — parity probes that pass (paths not covered by the study's tests)

The complete file is in the reviewer's scratch directory (`btc-review-1/probe1.test.ts`). Each probe runs both
engines on synthetic bars and asserts `compareRuns(...).differences` is empty (and the ledger reconciles where
noted), under `adverse`/`stop`/`low` with 10/5 costs:

1. Whole missing UTC days while long, followed by a stop exit, a continuation window spanning a missing day, and a
   pending order across a missing day (with `reconcileLedger` = []).
2. A buy decided on a day's last bar, followed by a whole missing day: it fills at the next existing day's first
   trade, and the entry day is that day.
3. Four reporting windows: a selection-like window ending while long; a validation-like window starting while long;
   an overlapping window; a window starting before the data.
4. Maximum hold due on a single-bar day: no exit that day in either engine; it exits the next day after the opening
   trade.
5. A buffered sale signalled on the day's last minute meets a stop that became active from that day's high and gaps
   at the next open: both engines take the gap.
6. An adverse stop on the day's last minute (m1): the engines agree.
7. The `low` vs `adverse` case (M2): the engines agree under each convention.
8. An exhausted account and the cancel path: the engines agree.

## Follow-up verification (2026-10-27T01:16Z)

The same reviewer, under the same constraints, checked the fixes listed in `PRE_FREEZE_DISPOSITIONS.md` before the
freeze. No outcome stage was run, and nothing was evaluated on the real data or the cache.

**Commands and checks:**
- the BTC unit tests (44/44 pass);
- `npm run btc-d1 -- data-audit` (MATCHES);
- an in-memory replay of the pinned `snapshot` rebuild, without writing the cache: the prefix verifies, the definition
  equals the sealed one, 0 malformed lines, and `assertValidSeries` passes on all 4,482,236 bars;
- counts from `PARITY-r2.json` only;
- 6 new synthetic probes in the scratch directory (`btc-review-1/probe3.test.ts`, `probe4.test.ts`); all pass, and
  probe 4 also demonstrates F1.

**Code state reviewed:**
- `PROTOCOL.md` `41e8693b…`, `engine.ts` `230dcb13…`, `fast.ts` `786e0554…`, `evaluate.ts` `e0bc89f8…`,
  `select.ts` `bdca1652…`, `stages.ts` `866477dc…`, `records.ts` `2aa9df6a…`, `cli.ts` `f5810735…`.
- Since PARITY-r2 was written, only `audit.ts` has changed, and it is outside the engine closure. PARITY-r2 is fresh
  for the code being frozen.

### Verdict

**Must fix first: one major finding (F1), plus one major I recommend (F2).** Every original major finding is fixed
as described, and none of the fixes broke the engines:
- The carried stop sale is identical in both engines in every path I built.
- "low" never fills above "adverse".
- G6, the shortlist rule, the records stamps, the freeze freshness guard and the sealed door all work as the protocol
  says.

F1 is a hole in the new out-of-sample gate: a position carried into the validation window escapes the "no single
trade carries the window" test. F2 is a guard gap: the data door lives in a file the freeze explicitly lets change.
Both are small code changes. F1 touches `evaluate.ts`/`stages.ts`, which are outside the engine closure, so no
parity rerun is needed. A few minor wording and record-text fixes in bound files are also due before the freeze.

### Findings

| # | Sev. | Where | What is wrong | Scenario | Fix |
|---|---|---|---|---|---|
| F1 | major | `stages.ts:596`; `evaluate.ts:87-92, 137`; `PROTOCOL.md:170` | The fold and holdout gate's "net minus the largest positive trade net > 0 (no single trade carries the window)" uses `topOne`, which only counts trades **entered in** the window. A position carried into the validation window from the selection period contributes its in-window gain to `net` but never to `topOne`. | Demonstrated (appendix C): a position entered in the selection period rallies inside the validation window. Window net +30,677 USDT, entries 0, `topOne` 0, so net − topOne = +30,677 passes. In a real fold, 4–5 small entries would satisfy the entries rule, and the gate would pass on the one carried-in trade. | Count the carried-in position's in-window contribution as a trade. Because cash changes only through trades, this is exactly `net − Σ tradeNets` (the nets of trades entered in the window, open ones marked). Use `topOne = max(largest positive entered net, net − Σ tradeNets)` and update the §8 wording. |
| F2 | major (guard) | `records.ts:116-124`; `cli.ts:307-414` (`sealedDoor`, `resolveDates`), `cli.ts:416-552` | The holdout door (`sealedDoor` + `resolveDates`) sits in `cli.ts`, which the freeze declares report-only: it may change after the freeze, and `verify` only lists it. `fixed`/`compare` never call `assertFrozen`, so after the freeze neither an edited door nor an edited `engine.ts` is refused by those commands. PROTOCOL §9/§10 promise a door "derived from the sealed records" and commands that "refuse any date after a phenotype's sealed permitted day". | After the freeze, an ordinary report-only edit to `cli.ts` (expected while the reports are written) regresses `resolveDates`. `fixed final-r1 --dataset all` then runs the sealed holdout with a failed gate, and no guard refuses. | Move `sealedDoor`/`resolveDates` into an outcome-critical module (e.g. `door.ts`, outside `reportOnlyFiles`). Have `fixed`/`compare` call `assertFrozen` whenever `PROTOCOL_FREEZE.json` exists. Formatting stays free to change. |
| F3 | minor (bound doc) | `PROTOCOL.md:130` vs `select.ts:128-141` | §7.3 says refinement seeds come "from the G1+G2 vectors", but the code takes them from the feasible set, G1+G2+G6 (the `select.ts` header says "feasible"). | An auditor applying the frozen text gets different seeds. | Reword §7.3 to "from the feasible (G1+G2+G6) vectors". |
| F4 | minor (bound doc) | `PROTOCOL.md:73-86` | The M5 note was inserted inside the §4 table, so the "Final selection" row (line 86) is detached after the paragraph and renders as stray text. | — | Move the D / M5 paragraph below the table. |
| F5 | minor | `stages.ts:432-442, 428`; `tables.ts:88` | `describeNoPick` ignores G6. If some vectors pass G1+G2 but none passes G6, PICKS seals the wrong reason ("no shortlisted vector passed G3, G4 and G5"). `compactCandidate.gates` omits `g6`, and the tables still say "G1+G2" and "G1–G5". | — | Check `poolSize === 0` first ("no evaluated vector passed G1, G2 and G6"), add `g6` to the gates, and update the labels. |
| F6 | minor | `stages.ts:356-367` | The freeze checks that the latest parity record is fresh but not that it is **clean**. It should also require 0 differences, 0 ledger problems, 0 mutation or truncation violations and every cheat caught ≥ 1. `stages.ts`, whose parity stage defines what parity runs, is not in `engineClosure`. PARITY-r2 is clean today, so this only matters if another rerun is written. | A future `PARITY-r3.json` with differences would still let `freeze` pass. | Add the cleanliness checks to `runFreezeStage`. |
| F7 | minor | `stages.ts:707-731, 760-779` | The gate stage checks that VALIDATION's stamp matches the frozen code, but not PICKS's. The holdout stage checks neither the gate's nor the final PICKS's stamp. There is a single write-once freeze, so this is defence in depth. | — | Check every record's `outcomeStamp` against the freeze. |
| n6 | note | `engine.ts:596-603, 646-661`; `fast.ts:411-413, 469-477` | "low ≤ adverse" holds per fill. Different exits change cash and the continuation window, so later trades can differ and a whole run's net under "low" is not strictly ≤ its net under "adverse". G5 and the fold gate are therefore a sensitivity, not a strict lower bound on a run. | — | Say so in BTC_CLOCK §5. |
| n7 | note | `engine.ts:760-779` | When a stop sale is still pending at the very end of the data, the open position is marked at the trigger minute's close, which can be above the sale's limit. At a selection cutoff, the continuous validation then books the gap in the next window, so the accounting is consistent. | — | Optionally mark a pending stop at min(limit, close) in reports. |
| n8 | note | `stages.ts:548-553`; `PROTOCOL.md:190` | In the year attribution, `metricsOf(…, run, i + 1)` reads its `subNets` from the next year windows. The value is unused, so this is harmless. §10's list of report-only files omits `main.ts`, which the code includes. | — | Wording only. |

### Checked and found correct

1. **Carried stop sale** (`engine.ts:596-603, 642-661, 720`; `fast.ts:411-413, 467-478, 500`).
   - With `adverse`/`low` triggered on the day's last minute, both engines carry the sale and sell at the next existing
     day's first bar at min(limit, open). The order is: carried stop, then gap, then carried buffer, then maximum hold.
   - The trigger day's high is not added to the stop: `stopAtExit` stays 99.75 when that day's high is 120.
   - The trigger day is marked as held at every minute's close; from bar 0 of the next day the mark is cash.
   - A missing next day is handled. At the end of data the trade is open, marked, and `pendingBufferedAtEnd` is set.
   - Two windows split at the pending day telescope to the total.
   - Scale and truncation mutations from every cutoff, under all three conventions and in both engines, show 0
     differences or violations (probe 3).
2. **low ≤ adverse, path by path.** Intraday: min(stop, low, next open) ≤ min(stop, next open). Carried:
   min(min(stop, low), open) ≤ min(stop, open). A minute opening through the stop and a day gap give the same price
   under both. The "stop" convention is unchanged.
3. **G1, G6 and the shortlist.**
   - G1's 35,000 USDT ceiling is in `passesG1`, and therefore also in G3's neighbour feasibility.
   - `Evaluator.evaluate` always appends `subperiodsOf(window)` as extra windows of the **same** run; probe 4 shows the
     three sub-nets equal separately computed windows of that continuous run and sum to the window net.
   - The shortlist rule (lineage quota of 6, then distance ≥ 0.1 from every admitted vector, skip counts recorded)
     matches §7.4, and `shortlistRule` is inside the hashed procedure.
4. **`outOfSampleGate`** matches §8, apart from F1.
   - The conservative row `fee20-impact10` exists in `costGrid` with adverse stops; the worst-fill net is a continuous
     run with `low` fills.
   - Entries ≥ ⌈3 × days/365.25⌉ gives 4 / 5, and 7 on the holdout. The % and USDT drawdown ceilings apply, and every
     test must pass.
   - The holdout stage refuses when the final selection has no pick.
5. **Records.**
   - There is no amendment path. `assertFrozen` checks the three documents, the procedure hash, the series,
     the outcome-critical digest, the btc-d1 script, the imports map, the lockfile and Node.
   - No outcome-critical module imports a report-only module (import graph checked), and no clock, environment or
     randomness is read in critical code.
   - Every outcome record carries `outcomeStamp`, and `verify` checks the stamps.
   - The freeze refuses a parity record that is stale for the 11-file engine closure. PARITY-r2 records 205 runs, 0
     differences, 0 ledger problems, 0 violations in 12 mutation rows (truncation included), and cheats caught at 1
     and 8 of 24 cutoffs.
6. **Door: no way left to read the holdout without a passing gate** (with `cli.ts` as written; see F2).
   - `sealedDoor` opens only for `final-rN` whose grid equals its PICKS entry, with `gate.pass`, HOLDOUT's
     `picksBodyHash` equal to that PICKS file's and the rank evaluated. Unknown ids and grids are refused.
   - `resolveDates` refuses `--dataset all`/`holdout`, any `--end` past the door, and a `--start` in the holdout.
   - `compare` applies every phenotype's door and aborts instead of trimming.
   - No other command runs an engine past 2024-06-30: parity uses development data only, the benchmark uses the fold A
     and final selection windows, and the final selection is sliced at the holdout start.
   - `phenotypes` refuses after a passing gate until HOLDOUT exists.
7. **Data.**
   - The snapshot rules now read only rows before the end. The 23:59 rule is what makes the pinned rebuild from the
     prefix reproduce the sealed definition: the prefix's last raw row is 2026-08-24T23:59Z.
   - The parser flags empty and foreign fields, and the data-audit result is unchanged (0 malformed lines, MATCHES).
   - `assertValidSeries` fails closed on build and on load.

### Appendix C — the F1 demonstration (synthetic; `btc-review-1/probe4.test.ts`)

```ts
const R = '/Users/chad/development/personal/margin-trading/src/btcusdt-d1';
const { makeSeries, flat, settingsOf, at } = await import(`${R}/tests/fixtures.ts`);
const { Evaluator } = await import(`${R}/evaluate.ts`);
const { dayOf } = await import(`${R}/calendar.ts`);
const D = (s: string) => dayOf(at(`${s}T00:00`));
const grid = { targetPercentChange: 100, trailingBuyPercentage: 20, trailingStopPercentage: 50, maximumHoldDays: 3,
  tickWindowSize: 2, intradayLossBuffer: 10, pullback: 50, continuationWindow: 3 };
const bars: any[] = [
  flat('2024-01-01', 100), flat('2024-01-02', 100),
  ['2024-01-03T00:00', 100, 100, 99, 99], ['2024-01-03T00:01', 99, 99, 89, 89],
  ['2024-01-03T00:02', 89, 89, 88, 88.5], ['2024-01-03T00:03', 88.5, 90, 88.5, 90],
  ['2024-01-03T00:05', 91, 92, 90.5, 92], ['2024-01-03T00:06', 92, 93, 92, 92.5], // entry at 91
  flat('2024-01-04', 93),
  flat('2024-01-05', 105), flat('2024-01-06', 118), flat('2024-01-07', 130),     // validation from 01-05
  ['2024-01-08T00:00', 130, 130, 120, 121], ['2024-01-08T00:01', 121, 121, 121, 121],
  flat('2024-01-09', 121), flat('2024-01-10', 121), flat('2024-01-11', 121)
];
const validation = { label: 'validation', startDay: D('2024-01-05'), endDay: D('2024-01-12') };
const m = new Evaluator(makeSeries(bars)).evaluate({ grid, settings: settingsOf(10, 5), armStartDay: D('2024-01-03'),
  window: validation, dataEndDay: validation.endDay });
// observed: carriedIn true, net 30677.06, entries 0, topOne 0 -> net - topOne = 30677.06 > 0 (the test passes)
```
