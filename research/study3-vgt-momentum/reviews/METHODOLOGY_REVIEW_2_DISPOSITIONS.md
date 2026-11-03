# Dispositions — methodology re-review 2 (pre-freeze, protocol v1.1)

Review: `METHODOLOGY_REVIEW_2.md` (verbatim; sha256 `c0fdc86a3cbc3140619b6116bf7ee02b1c2bbe7ca83bc61468726edfd2480b29`).
Written 2026-10-28 between 17:25Z and 17:32Z, before any momentum outcome. Changes land in `PROTOCOL.md` v1.2, the
catalog (text corrections), the matrix v1.2 and the code; 20 study tests pass after them.

| # | Sev. | Disposition |
|---|---|---|
| 1 | MAJOR | **Accepted; my disposition 1 and checkpoint were wrong** (the caps had not been changed in code). `context.ts` now has `capPerHistory` 16,000 and `capTotal` 80,000; `capPerFamilyHistory` removed (each family's evaluator is capped at its planned count). A test asserts the caps and that 4·1,328 + 6·1,296 + 2·1,264 + 70 ≤ 16,000 and 5 × that ≤ 80,000. |
| 2 | MAJOR | **Accepted, option (a):** the code's rule is written into the catalog (`levelFresh`) and P §3 — a level family enters at any flat close whose state is IN while no campaign is alive; the asymmetry (lapse-and-requalify during a trade enters next session after a stop; a state that stayed IN waits for the re-entry rule) is disclosed. No code change. |
| 3 | MAJOR | **Accepted (preferred fix):** C-TSM is decided at the close of each month's **first** session, in the catalog and FP §6 (the code already did this; no `dates[s+1]` look-ahead). |
| 4 | MAJOR | **Accepted and implemented:** `compareWithReference(..., redact = true)` emits field names, counts and \|Δ\| only; S2 uses it for market data and its failure log prints counts only; a failing S2 stays sealed and reruns as `parity-rerun-<n>`; S3 requires the latest attempt to pass (P §6). |
| 5 | MAJOR | **Accepted and implemented:** an independent C-ALR restatement in `reference.ts`; a closed-form synthetic test (segments, friction on the traded difference, $100k interest, liquidation) and random-walk parity (incl. +1 minute, 10 bps); C-ALR added to S2(b) and S7 parity. |
| 6 | MINOR | **Accepted and implemented:** the random-entry placebo disables the minute rule (P §10). |
| 7 | MINOR | **Accepted and implemented:** placebo holds are "sessions to the exit decision" = sessions held − 1 (≥ 1) (P §10). |
| 8 | MINOR | **Accepted:** "equal within $10⁻⁶" (P §3). |
| 9 | MINOR | **Accepted:** (a) R fails if D's P\* is undefined; (b) dollar-day definition; (c) Π definition; (d) R0's second clause is now "every stressed window's minute DD ≤ $35,000" (code changed); (e) E's per-window test uses the $2,000 materiality (code changed); (f) K's maximum over defined folds for P\*, all four for controls; (g) campaigns = first lots of first entries in the development window, an open one included (P §11). |
| 10 | MINOR | **Accepted:** E06 in P §1(c). |
| 11 | MINOR | **Accepted:** precedence clause in the P header; FP §6 lists the superseded sentences. |
| 12 | MINOR | **Accepted (text aligned to code):** A2 decides at Friday closes only; no decision in a week whose Friday is a holiday. |
| 13 | MINOR | **Accepted:** exact neighbourhood wording (centre ∓ 2·step) in P §8. |
| 14 | MINOR | **Accepted and implemented** in engine and reference: a carried minute decision fills at the first trade ≥ the next open + k (no double counting). |
| 15 | MINOR | **Accepted:** `audit/trigger-rates-synthetic.txt` recorded before S1 (E09 ≈ 9.0 entries/yr, exposure 0.75; E10 1.85, 0.16; others 1.3–4.8, 0.16–0.44); disclosed in FP §6. |
| 16 | MINOR | **Accepted:** P0-vs-P\* line (P §11); exposure-scaled Z0 comparison (P §10, computed from the M2Z rows); per-fold realised/unrealised split, profit factor, holds and MAE/MFE from the window trade rows (P §9); the X2 crisis trace (ratcheted and un-ratcheted) added to S6 (code). |
| 17 | MINOR | **Accepted:** E12's parenthetical moved; E09/E10 wording "the first completed minute, in a session after the exit session, …". |
| 18 | MINOR | **Accepted:** the checkpoint now uses clock times only, quotes the S0 record hash and states the corrected caps; the catalog's `written` field gives clock-bounded intervals. |
| 19 | NOTE | **Accepted:** S7 lists, per finalist, every held session whose closing print was at or below the untriggered stop and whether the next opening trade was too (engine records them). |
| 20 | NOTE | **Accepted as a disclosure** (P §10). |
| 21 | NOTE | **Accepted:** both disposition files are in the protocol freeze set (`records.ts protocolFiles`). |
| 22 | NOTE | **Accepted:** the matrix lists C-AL with its own exit only. |
| 23 | NOTE | **Accepted and implemented:** the trade-path hash is sha256 (24 hex digits). |
| 24 | NOTE | Noted (no look-ahead found; rules agree with §3). |
