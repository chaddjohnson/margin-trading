# Final independent code-and-evidence audit — Study 3, Stage 1b

**Auditor:** an independent, read-only agent context (not the study author). **Written:** 2026-10-29T01:08Z (UTC, `date -u`).
**Scope:** `research/study3-vgt-momentum-stage1b/` and `src/study3-vgt-momentum-stage1b/` at working tree on branch
`research/study3-vgt-momentum-stage1b` (HEAD `db6a3ec83bfade06441efe9ae2219e2bc07a25fc`, Stage 1b files untracked).
I modified no file except this report. I did not run any `stage <name>` command, did not change Git state and did not read
the contents of `data/VGT/data.csv` (hashed only).

## 0. Summary verdict of the audit

**The sealed evidence supports the frozen label "risk-incompatible" and "nomination: none".**

- I recomputed every rubric quantity of PROTOCOL §11 for Π1 (and Π1-S2, Π-NET and the descriptive paths) from the
  sealed payloads (`evaluate/runs.json.gz`, `evaluate/legs.json.gz`, `robustness/*.json.gz`, the develop records), with my
  own code, and every value matches `results/records/analysis.json` (differences ≤ 1e-9 $).
- The label is applied in the frozen order: (a) passes on every check I could reproduce, (d) passes with wide margins,
  (c) fails. The (c) failure is robust: Π1's chained minute DD is $42,882; even the **daily-close** chained DD (which I
  recomputed from the daily rows) is $41,304 > $35,000; Π1-S2 is $44,342; every rubric stress keeps the DD at
  $41.8–43.9k; 66% of the 128 perturbed paths breach $35k. Independently of (c), items (b), (e), (f) and (g) all fail, so
  no defect I found could produce a "historically promising" label or a nomination.
- No BLOCKER. Two MAJOR findings concern **undisclosed deviations from the frozen test/deliverable plan** (missing
  fixtures; missing required diagnostics, one of which a report claims exists). Neither changes the verdict. The MINOR
  findings are report inaccuracies, a defective field in the sealed event ledger, two unimplemented identity checks, and a
  stale recovery checkpoint.
- Git scope, freezes, doors and Stage 1 integrity all verify. Stage 1b is **not yet committed or pushed** (expected at
  this point, but a §15 item that is still open).

## 1. What I ran (all read-only)

| Command (repository root) | Result |
|---|---|
| `sh research/study3-vgt-momentum-stage1b/scripts/study3-momentum-stage1b.sh verify` | `"problems": []`, 11 records |
| `sh research/study3-vgt-momentum-stage1b/scripts/study3-momentum-stage1b.sh status` | every stage "sealed, verifies"; both freezes "frozen" |
| `npm run study3-momentum -- verify` (Stage 1) | `"problems": []`, 14 records |
| `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study3-vgt-momentum-stage1b/tests/engine.test.ts` | 27 tests, 27 pass |
| `npx tsc --noEmit -p .` | no output (no errors) |
| `git diff db6a3ec83bfade06441efe9ae2219e2bc07a25fc -- . ':!research/study3-vgt-momentum-stage1b' ':!src/study3-vgt-momentum-stage1b'` | empty |
| `git status --porcelain --untracked-files=all` | only the two Stage 1b namespaces (plus git-ignored `results/logs/`) |
| `git diff db6a3ec -- research/study3-vgt-momentum src/study3-vgt-momentum` | empty |
| `git diff --name-status origin/main~1 origin/main` | `A CLAUDE.md`, `A docs/claude/context-recovery.md` only; blobs `f45cab6…`/`c0c4d05…` = db6a3ec's; sha256 `054d7525…`/`744c934d…`; parent `d7b6108`; `git ls-remote origin refs/heads/main` = `3ef43015…` |
| `git ls-remote origin refs/heads/research/study3-vgt-momentum-stage1b` | empty (branch not pushed yet) |
| `sha256sum data/VGT/data.csv` | `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09` = every record's door |
| `sha256sum` of every file quoted in `IMPLEMENTATION_AUDIT.md` §2 and every record | all prefixes match (protocol `aa255bc9…`, contract `7eed7cc0…`, matrix `7790d016…`, brief `c7b09fe8…` (48,953 bytes), dispositions `f016aa72…`/`b0342898…`/`446d8b74…`, AMENDMENTS `3dc95e6d…`, PROTOCOL_FREEZE `236eaffa…`, code_freeze `594e6168…`, engine `54f26b09…`, reference `50d34873…`, records `4712ba92…` … `5c6b4f56…`, body hashes `44fcaaf5…` … `d999eb98…`) |

Not re-run by me: the full `npm test` suite, `eslint`, any stage.

## 2. Independent recomputation of the verdict (Π1 = S1 path of the sealed RoD picks)

Picks in the Π1 schedule equal the sealed `develop-A..D` `picks.rod` (A `E06/XV/R3F/Z1-2e7497e652`, B
`E03/XV/RC10/Z2(0.5,0)-2f5953bc19`, C `E03/XT/R3F/Z1-a89fb7604d`, D `E06/XV/RC10/Z1-b664e958e4`).

| Quantity | My recomputation (source) | `analysis.json` |
|---|---|---|
| W_F = liquidation(e_F) − liquidation(b_F) from the daily rows | +14,431.96 / +18,058.61 / −30,965.94 / +11,048.74 | identical |
| Σ W | +12,573.36 (= endLiquidation; start mark 0 at 2019-12-31) | identical |
| Window minute DD (sealed tracker) / daily-close DD (my recomputation) | 13,093.50 / 8,508.78 / 33,488.16 / 13,350.47; daily 11,595.40 / 7,150.13 / 33,419.61 / 12,440.86 | identical |
| Chained minute DD | 42,881.89 (peak +35,202.49 at 2021-11-22 15:23Z, trough −7,679.40 at 2023-03-15 16:57Z); my daily-close chained DD 41,304.01 | identical |
| f_MV,F = grossDollarDays / calendarDays / B₀ | 0.5530 / 0.7413 / 0.3719 / 0.7435 | identical |
| B_F = f_MV × (W_F(C-ALR) + interest_F(C-ALR)) − interest_F(Π1) | 17,033.48 / 14,392.18 / −14,738.92 / 26,363.41 | identical |
| Excess W_F − B_F | −2,601.52 / +3,666.43 / −16,227.02 / −15,314.67; Σ −30,476.78; windows ≥ $2k: 1 | identical |
| Control margins Σ W − max(flat, reset) | C-SMA 12,573.36 − 45,729.03 = −33,155.67; C-DON − 33,715.58 = −21,142.21; C-TSM − 34,745.74 = −22,172.38 | identical |
| Reset controls use Π1's overlays | Z1, Z2(0.5,0), Z1, Z1 in the four windows (`policies[].key.sizing`); reset-net uses Π-NET's Z1, Z0, Z0, Z2(0.5,0) | — |
| (d) own-rule exits (stop 9 + stop gap 3 + trend 2 + own out 3) | 17 | 17 |
| (d) first entries excluding `adoption` | 14, in windows {A, B, C, D}; adoption entries 2 (2020-01-02, 2021-01-05) | 14 / 4 |
| (d) windows with a position at ≥ 1 close in (b, e] | 4 | 4 |
| (g) largest campaign contribution (Σ of trade contributions incl. transition sub-lines) | campaign #2 (trades 2 + 3) 12,090.70; Σ W − it = +482.66 | identical |
| (g) largest up-leg change of Π1's liquidation mark over (max(t0, 2019-12-31), t1] | leg 2020-03-23 → 2020-09-02: +18,348.72; Σ W − it = −5,775.36 | identical |
| (g) Σ giveback / Σ peak, campaigns with peak ≥ $5,000 | 10 campaigns, 0.61249 | identical |
| (f) perturbed paths (`robustness/perturbed.json.gz`, 128 rows, j = 0…127) | 43 with Σ W > 0 and DD ≤ $35k = 33.6%; median Σ W +20,969.08 (≥ 50% × 12,573 passes); 116 positive, only 43 within DD; 0 of 128 positive in 2022 | identical |
| (f) the four rubric stresses (Σ W / chained DD) | 10 bps +10,186.57 / 43,718; 14% +7,066.09 / 43,937; stop 25 bps +9,163.17 / 43,484; +1 min +12,929.28 / 41,768 | identical |
| Label in §11 order | (a) pass → (d) pass → **(c) fail → risk-incompatible**; (b), (e), (f), (g) also fail | `risk-incompatible`, failed `["c"]` |
| Nomination | none (label is not "historically promising") | `none` |

Also reproduced: Π-NET (b) pass, (c) 18,015 pass, (d) pass (9 first entries in A, B, D), (e) fail (Σ excess −26,876.36;
C-SMA margin +4,803.78 < 5,000), (f) pass (97.7%, median 48,152), (g) pass (giveback share 0.4967) → "no demonstrated
edge"; Π1-S2 (b) and (c) fail; window decomposition W_F = Σ contributions − Δ carried interest holds in every window of
Π1, Π1-S2 and Π-NET (to 1e-4 $).

## 3. Accounting recomputed by hand from sealed fields (5 bps, 11% simple, 365-day, session-date days)

- **Π1 trade 1** (E06 × XV adoption entry): S = 100,000 / (247.05 × 1.0005) = 404.574074; gap stop at the 2020-02-24
  opening trade 252.18 (level 261.3244, shortfall 9.1444, flag `gap`); sell 252.18 × 0.9995 = 252.05391; proceeds
  101,974.4772; interest 100,000 × 0.11 × 53/365 = 1,597.2603; net 377.2170; price gain 2,075.4650; friction
  49.975 + 51.013 = 100.9878; price gain − friction − interest = 377.2170. All equal the sealed fields.
- **Π1 trade 3** (R3F re-entry with two Z1 trims): S = 358.038490; trim 2020-08-04 q 27.109905 × 301.94 × 0.9995 =
  8,181.4719 (all repays principal → L 91,818.5281); trim 2020-09-02 q 33.274103 × 340.74 × 0.9995 = 11,332.1489
  (L 80,486.3792); the implied deciding closes 302.18 and 335.96 are consistent with Z1 (G > $105k on the first close of
  August/September); intraday stop 2020-09-03 at the minute open 317.64 ≤ level 317.7346 on 297.654483 shares → 94,499.6964;
  interest 100,000 × 0.11 × 42/365 + 91,818.53 × 0.11 × 29/365 + 80,486.38 × 0.11 × 1/365 = 2,092.4784; net 11,920.8388.
  Equal to the sealed fields.
- **Identity (i) for Π1:** Σ trade nets 7,541.5049 − carriedInterest (−5,031.8577) = 12,573.3626 = endLiquidation. Net-debit
  account interest recomputed from the M segments of the event ledger: 20,193.3177 = Σ trade interest 25,225.1754 +
  carried −5,031.8577; end liquidation M + S·C·(1−c) − A = 12,573.3626. Same agreement for Π1-S2, Π1-S3, Π-NET, C-SMA.
- **Identity (iv) on all 280 trades of the 25 evaluate runs** (segments split at trims): max |Δ| 3.6 × 10⁻¹².
- **Stage 1's March-2020 E04 lot** (`repair/foldCFull.json.gz`, trade 7): S = 100,000 / (193.27 × 1.0005) = 517.152300;
  own-OUT exit 2022-01-24 at 393.88 → 393.68306 × S = 203,594.0999; interest 100,000 × 0.11 × 679/365 = 20,463.0137;
  **lifetime net +83,131.0862**; price gain 103,745.9229; friction 151.8230. At 2021-12-31 (close 458.17): gross
  236,943.67, L/G 0.42204, open liquidation value 117,085.47; **2022 increment −33,954.39**. The 2020-03-13 close was
  +11.0% on the day and the 2020-03-16 open 12.0% below it (closes derived from C-AL's sealed gross/shares rows).
  All equal `repair.json` `lotTrace` and the reports.

## 4. Chronology, doors and freezes

- Doors: audit A–H ends; parity 2019-12-31; develop-A 2019-12-31, B 2020-12-31, C 2021-12-31, D 2022-12-30, H 2023-12-29
  (= their development ends); repair/evaluate/robustness 2023-12-29. Every `lastBarTime` is 20:59Z on the end date; no
  record's door passes 2023-12-29. Parity refusals of 2024-01-02, 2025-12-31, 2026-01-02 are all `refused: true`.
- Code: `results/code_freeze.json` `manifestHash` `dc37a602…` = parity `codeManifestHash` = every later record's
  `codeFreeze`; `verify` recomputes the manifest and passes. Order: protocol freeze 23:47:17Z → A1 00:19:04Z (pre-outcome)
  → parity 00:23:11Z → code freeze 00:24:43Z → first develop-A log line 00:24:58Z → … → analysis 00:38:23Z.
- `develop.ts` reads only the history's evaluator pool (data loaded to the development end); `evaluate` b-marks reproduce
  all 15 sealed picks' development nets and path hashes on the full data; prefix, poisoned-future and truncated-run
  guards 0 differences at all four boundaries; 25 evaluate paths fast = reference 0 differences.
- Executability (my own check on Π1, Π1-S2, Π1-S3, Π-NET, Π-P0, Π-noE06, static-A): every trade's policy is the active
  scheduled policy at its entry, no overlap, no entry in an exit session, daily entries only at bar 0.
- Code review of `analysis.ts`, `paths.ts`, `stages2.ts` (and the selection logic of `develop.ts`/`search.ts`): window
  indexing (`index > boundary && index ≤ end`), contributions, campaign givebacks, the benchmark, the controls
  (flat-start and reset, rubric set C-SMA/C-DON/C-TSM), the four stresses chosen, the perturbed paths (j-th J128 draw of
  every fold pick, re-entry/sizing/discrete fixed, seed `study3b|<policyId>|J128`) and the label order all follow
  PROTOCOL §9–§11. **I found no look-ahead and no verdict-affecting bug.**

## 5. Findings

### F1 — MAJOR — Frozen fixture plan (PROTOCOL §12) only partly implemented; the gap is undisclosed and partly misreported

- Evidence: `tests/engine.test.ts` has no test for **F4** (levels reset above the close → `level above prior close`),
  **F9** (trim pending on a gap-down open; trim + same-session stop — one of the fixtures PROTOCOL §12 and review-2
  disposition #6 (MAJOR) promise *in closed form*), **F12** (−20% opening gap through XF/XV/XRD/XE/XU), **F18** (XO count
  across a re-entry). **F20** ("identities (i)–(vii) on every fixture") is applied only as (i), (ii), (iii), (v), (vii) and
  only where `assertIdentities` is called. **F13** lacks the crash case with a gap through the old stop at b+1, a pending
  close-decided exit at b, a pending minute decision at b, a pending trim at b, b+1 after New Year's Day, and S2 across two
  boundaries. **F15** covers only RS (no campaign death by own OUT while long, no RPM replacement/expiry, not "every
  re-entry rule on a hand path").
- `IMPLEMENTATION_AUDIT.md` §5 lists the fixture IDs as if the set were complete and §4/§8 disclose only the
  S2-two-boundary gap. `EXECUTABLE_ANNUAL_SELECTION.md` §2 says "F13: crash …; F24: … holiday boundaries" — neither a
  crash fixture nor a holiday-boundary fixture exists (F24 uses plain synthetic sessions; F6 tests only Friday → Monday
  interest).
- Impact: not verdict-affecting — the fast engine agrees with the independently written reference on 3,728 fold-A runs
  and on all 25 evaluate paths (0 differences, |Δ| ≤ 3.6 × 10⁻¹¹) and with Stage 1's engine on 1,626 runs, and the label is
  driven by a drawdown that also fails on daily closes. It is a deviation from a frozen protocol commitment.
- Fix: disclose F4, F9, F12, F18, the F13/F15 sub-cases and the partial F20 as deviations in `IMPLEMENTATION_AUDIT.md`
  §5/§8 and in `FINAL_COMPARISON_AND_RECOMMENDATION.md` §4; correct `EXECUTABLE_ANNUAL_SELECTION.md` §2. Do not add tests
  to the frozen manifest now; if wanted, add them by amendment as exploratory.

### F2 — MAJOR — Several protocol-required diagnostics are absent; one report says one of them exists

- **Drawdown-matched comparison** (PROTOCOL §9 diagnostics, §11 "A drawdown-matched comparison with the controls is
  reported"; review-1 disposition #6): absent from every table. `EXPOSURE_AND_POSITION_SIZING.md` §4 states it "is in
  `results/tables/verdict.md`" — it is not. My recomputation from the sealed windows (C-ALR scaled per window by Π1's
  window minute DD / C-ALR's): +10,347 / +13,688 / −26,952 / +33,407, Σ +30,490 → **Π1 is $17,917 below the DD-matched
  C-ALR** (chained-DD scaling 0.901 → +$49,125). Stage 1's **principal-day** benchmark for Π1 is also absent (f_L
  0.529 / 0.693 / 0.373 / 0.700 → Σ +44,949 → Π1 −$32,376). Both point the same way as the primary (e).
- **Splice − executable decomposition** (§5.3: carried-lot increment, transition gap and friction, re-entry timing after
  adoption, interest; review-1 disposition #22(b)): only a qualitative sentence in `EXECUTABLE_ANNUAL_SELECTION.md` §3–§4.
- **Per re-entry rule, the share of re-entries caused by the rule vs a fresh/minute trigger** (§7.4; review-1
  disposition #19): not in `reentry-lc.md` or `REENTRY_AND_CAMPAIGNS.md`.
- **§8 per major up-leg, share of neighbours capturing it** (capture ≥ 50%): not computed (`neighbourhoodOf` has no leg
  statistics). **§10 lost post-stop gain per leg**: not computed (`legCapture`).
- **§9 / brief §10 turnover, risk per notional dollar-day, net per $1M notional dollar-days, the negative-cash/idle-cash
  comparison between financing modes**: not reported for Π1.
- **§10 XV crisis traces "for every XV-containing finalist"**: `stages2.ts` traces only the first XV pick (fold A);
  B, D are XV picks too.
- **§12 (c) coverage counters "delayed fills" and "closing-print fills"**: not in the `required` list in `stages.ts` and
  never counted.
- Impact: descriptive only; no rubric item depends on them. Fix: state each as an omitted deliverable in
  `IMPLEMENTATION_AUDIT.md` §8 and remove the false pointer in `EXPOSURE_AND_POSITION_SIZING.md` §4 (or quote the values
  above, labelled as computed by this audit from sealed payloads).

### F3 — MINOR — (a) overstated: identities (iv) and (vi) are not checked by the code

- `analysis.ts ledgerChecks` checks (i), (ii), (iii) (repayment = min(L, P) only; not "L never increases"), (v), (vii) and
  executability; (iv) and (vi) are not implemented. `IMPLEMENTATION_AUDIT.md` §4 states the subset correctly, but
  `FINAL_COMPARISON_AND_RECOMMENDATION.md` §1 row (a) says "every … ledger identity holds".
- My check of (iv) passes on all 280 evaluate trades (§3). (vi) cannot be checked from the sealed event ledger (F4).
- Fix: reword row (a) to "identities (i), (ii), (iii), (v), (vii) checked in code; (iv) verified by the final audit; (vi)
  covered only indirectly by mark/DD parity with the reference".

### F4 — MINOR — Defective fields in the sealed event ledger at exits, transitions and conversions

- `engine.ts` `settle()` calls `event()` after `bookFill` (M already includes the proceeds) but before the position is
  cleared, so exit-type events record the pre-exit `S`, `G = S × raw` and `mark = M_after + S_before × raw − A`.
  Examples (Π1): trade 1 exit event `mark` 102,402.71 (true post-fill mark 1,974.48 − 1,597.26 = 377.22); trade 3 exit
  event `mark` 107,085.15 (true 16,730.26 − 4,192.08 = 12,538.18). Entry and trim events are correct.
- No verdict quantity, daily row or readable table uses event marks (checked `report_tables.py`), but the brief asks for
  reproducible machine-readable ledgers and identity (vi) cannot be audited from them.
- Fix: disclose in `TRADE_LEDGER_AND_RISK.md` §1 and `IMPLEMENTATION_AUDIT.md` §8 that exit-type event rows show pre-exit
  S/G and a non-post-fill `mark`; the true post-exit mark is `M − interest`. Correct in a future study's engine.

### F5 — MINOR — Report statements that are incorrect or unsupported by the sealed payloads

1. `README.md` "every control earned more"; `FINAL_COMPARISON…` §2 "every conventional control and the always-long
   references earned more": **C-STOP flat-start earned +$11,141 < Π1's +$12,573** (C-IDLE 0). Say "every rubric control
   (C-SMA, C-DON, C-TSM, flat and reset) and every always-long reference".
2. `FINAL_COMPARISON…` §2 "E06 × XV, E06 × XT, E06 × XF-T with RC10: +$105–138k at **$14–15k DD**": the H rows are
   +$105,674 / $16,394 (XV with **RP50**), +$112,782 / $15,031 (XT), +$137,611 / $19,471 (XF-T, RC10) → "$15–19.5k DD".
3. `FINAL_COMPARISON…` §2 "peak position value ≤ $116k vs Stage 1's $241k lot": the $241k lot exists only in Stage 1's
   non-executable splice; Stage 1's executable S1 path (the like-for-like account) peaked at **$133,673** (S2 $175,329).
4. `TRADE_LEDGER_AND_RISK.md` §1 "account interest $20,192": 25,225.18 − 5,031.86 = **$20,193** (A recomputed 20,193.32).
5. `TRADE_LEDGER_AND_RISK.md` §1 "505 sessions under water": counted from the daily-close peak 2021-12-27, while the
   same sentence dates the peak to the minute peak 2021-11-22 (528 sessions from there). State the basis.
6. `EXECUTABLE_ANNUAL_SELECTION.md` §3 "buys E06-9ee2ce7bd5 at 2020-01-02 … sells it at the 2021-01-04 transition
   (+$27,164 lifetime)": two different trades — the 2020-01-02 adoption lot exited 2020-03-06 by own OUT (−$7,714); the lot
   sold at the transition was bought 2020-06-04.
7. `EXECUTABLE_ANNUAL_SELECTION.md` §2 fixture claims ("crash", "holiday boundaries"): see F1.
8. `EXPOSURE_AND_POSITION_SIZING.md` §2: Z3($25k) "exit 2022-01-19 (**5** sessions earlier)" → **3** sessions
   (01-19 → 01-24). "at the cost of **$10–19k** of upside on the rest of the history" is not supported by the counterfactual
   payload: total-minus-2022 cost is $10.4k (Z2(1,0)) to $39.5k (Z1) fixed-slot; whole-history differences are −$18.8k to
   +$7.0k. The "Z0 net-debit +$173,907" figure has no Z0 net-debit run in `counterfactuals.json.gz`; it equals the
   Z3($40k) run, which is path-identical to Z0 (same fixed-slot result) — say so.
9. `EXPOSURE_AND_POSITION_SIZING.md` §4 pointer to a drawdown-matched table: see F2.
10. `REENTRY_AND_CAMPAIGNS.md` §3 "Π1 captured **25–60% of each** 2020–2023 up-leg (… idle 23–82%)": the 2022-03-14 →
    03-29 leg had capture 0 and idle 100%. "the D pick … made **eight fresh entries** and three RC10 re-entries": 2023 had
    5 fresh first entries (trades 14–18) and 3 RC10 re-entries (19–21) — eight entries in all.
11. `REENTRY_AND_CAMPAIGNS.md` §5 '"no re-entry" (RN) never won': true for L-C step 2, but in the H screening RN was the
    best rule for E12 (+$32k vs R3F +$21k) and beat R3F for C-SMA (+$64k vs +$55k); §1's E12 row omits it.
12. `JOINT_COMBINATIONS.md` §3 "development drawdowns of $9–16k and J128 development neighbourhoods that are 100%
    net-positive and within $35k": fold D's pick is 99.2% within $35k; several protective pairings exceed $16k DD (e.g.
    H P03 $19,471, D P12 $20,250). Restrict the claim to the five RoD picks.
13. `README.md` "Status: Stage 1b COMPLETE" and the `reviews/` row listing a final audit were written before this audit,
    the commit and the push; the checkpoint says INCOMPLETE. Align after closing.

Everything else I spot-checked matched the payloads to the dollar (≥ 10 numbers each in FINAL_COMPARISON,
EXECUTABLE_ANNUAL_SELECTION and TRADE_LEDGER_AND_RISK — all Π1/Π1-S2/Π1-S3/C-ALR/C-SMA rows, rubric values, Stage 1
S1 trades and dates, the lot trace, the 2022 trades' entry/exit prices, peak profit and giveback; and several in every
other report — the H matrix spot cells, B-D1T vs XF, B-D1N 6/7, XM20 12/13, exit-cell champions, pairing scores, fold
and H neighbourhood statistics, all 15 stress rows, the perturbed distribution, the counterfactual table, f_MV, hashes,
main-integration blobs/line counts).

### F6 — MINOR — Descriptive (g) up-leg item silently set to 0

- `analysis.ts` passes `legNets` only for Π1-S1, Π1-S2 and Π-NET; for Π1-S3, Π-P0, Π-noE06 and static-A `largestLeg`
  is 0 and `verdict.md` prints "largest up-leg +$0 (Σ − it +$…)"; static-A's (g) shows "pass" on that basis. Disclosed in
  `IMPLEMENTATION_AUDIT.md` §8, not in `verdict.md`. Labels unaffected (driven by (c) or (b)/(e)), but static-A's failed
  list may be incomplete. Fix: print "not computed" for that clause in `verdict.md`/reports.

### F7 — MINOR — The task checkpoint is stale and partly wrong

- `RESEARCH_RECOVERY.md`: "Amendment head: **none**" (A1 exists, `AMENDMENTS.md` `3dc95e6d…`); "every stage sealed
  (audit → analysis, **00:37–00:38Z**)" (audit sealed 2026-10-28T23:35:46Z, develop-A..H 00:26–00:37Z); the stage table
  still shows "3 Implementation … running" and has no rows for parity … analysis (commands, times, hashes, guards); the
  "next step" says to write reports that are already written. Fix before the closing commit, per
  `docs/claude/context-recovery.md` §1/§2.8.

### F8 — MINOR — Control naming: `C-ALZ1|reset` is not C-ALZ1

- `controlResetSchedule` gives every reset control Π1's overlay, so `C-ALZ1|reset` uses Z2(0.5,0) in 2021 and equals
  `C-AL|reset` exactly (+$60,074). Not a rubric control. Fix: label it "C-AL reset with Π1's overlays" in tables.

### F9 — NOTE — Verdict margins and sensitivities worth stating

- Π1's 10 bps stress passes the Σ W ≥ $10k sub-test by $187 (fails on DD). Π-NET's (g) giveback share 0.4967 passes by
  0.003 and its C-SMA margin fails by $196; Π-noE06's chained DD exceeds $35k by $32. None affects the Π1 label.
- The missing-bars stress leaves Σ W unchanged to the cent for Π1 and P\*_H at 1% and 5% (session arrays are unchanged
  and level fills are price-invariant); it is a weak stress — say so.
- The recommendation in `FINAL_COMPARISON…` §5.2 (a low-exposure trend filter inside the D1 pool) is informed by Π-NET's
  2022 behaviour in an evaluation window; label it a hindsight-informed hypothesis.
- The Stage 1-configuration parity on fold-A market data during implementation ("Stage 1 parity dev 1,586/0 diffs" in the
  checkpoint) has no recorded time relative to the protocol freeze; it produced difference counts only, on Stage 1
  configurations — record its timing.
- `src/d1-ranked-preemption/freeze.ts` builds a code manifest over all `src/**/*.ts`; adding `src/study3-vgt-momentum-stage1b/`
  changes that digest (as Stage 1's files already did). Brief §11 / CLAUDE.md §4 ask that such historical verifiers be
  checked at their own commits; not mentioned in Stage 1b's reports.
- Coverage: the S2-two-boundary gap is disclosed; the parity `pass` flag does not depend on coverage (consistent with
  §11 (a)'s definition of a parity failure).

## 6. Brief §15 checklist — items not (yet) met

| Item | Status |
|---|---|
| Brief saved with SHA-256; branch/worktree inspected | met (48,953 bytes, `c7b09fe8…`) |
| Policy-only integration on `main`, remote-verified | met (`3ef43015…`, two files, blobs = db6a3ec's) |
| Branch from Stage 1 head; Stage 1 untouched; checkpoint maintained | branch and Stage 1: met; **checkpoint stale/inaccurate (F7)** |
| Pre-freeze reviews, sealed protocol/budgets/code/doors, no 2024–2026 bars | met |
| Splice reconciled; executable path; E04 lot explained | met (to the cent) |
| Self-financing fixed-share vs optional trim; exposure/borrowing accounting | met, with F5.8 report errors |
| Exit optimisation, ablations, re-entry, bounded pairings | met; per-rule re-entry attribution missing (F2) |
| OAT and joint neighbourhoods, DD feasibility separate, costs/gaps/interest, winner retention, time idle | mostly met; per-leg neighbour capture and lost post-stop gain missing (F2) |
| Selector, independent audit/parity, tests, complete reports, hash manifests, ledgers, no forbidden changes | **partly**: fixture plan incomplete (F1), required diagnostics missing (F2), event-ledger defect (F4), audit dispositions pending |
| Committed, pushed, remote HEAD verified | **not met yet** (untracked; no remote branch) |
| No Stage 2–4, no 2024–2026 tests, no promotion; stop | met |

## 7. Disclosures that should be added before commit

1. Fixtures F4, F9, F12, F18 not implemented; F20 partial; F13 and F15 sub-cases missing (F1).
2. Missing diagnostics: drawdown-matched and principal-day benchmarks for Π1 (values in F2), splice − executable
   decomposition, per-rule re-entry attribution, per-leg neighbour capture, lost post-stop gain, turnover / risk per notional
   dollar-day / net per $1M notional dollar-days, financing-mode cash comparison, XV traces for B and D, uncounted
   delayed/closing-print coverage (F2).
3. Identities (iv), (vi) and "L never increases" not checked in code; (iv) verified by this audit (F3).
4. Exit-type event rows carry pre-exit S/G and a non-post-fill `mark` (F4).
5. The descriptive paths' up-leg clause is "not computed" (F6); `C-ALZ1|reset` naming (F8).
6. The corrections in F5, and the margins and sensitivities in F9 (including the d1-ranked-preemption manifest and the
   timing of the implementation-time Stage 1 parity runs).
7. Update `RESEARCH_RECOVERY.md` (F7) and the README status once the audit dispositions, commit and push are done.
