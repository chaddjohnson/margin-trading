# RESEARCH RECOVERY — Priority 3C: fixed-anchor GDX Growth partner search (C4-refined, C4, VGT #4)

## Top screen

- **Updated:** 2026-11-10T15:59Z (UTC). **Status: COMPLETE** (pending the commit and push of the report; the push record
  follows as its own commit). Every stage sealed; `REPORT.md` (sha256 `74b30bcb…b521`), tables and roadmap written.
- **Outcome: keep GDX Growth OFF beside every baseline** (frozen rule): no partner dominated C4-refined or C4 on
  development (no partner candidate); beside VGT #4 alone the trivial candidate (`C24/G/broad-breakout#3 balanced`,
  +$863.66) trailed the baseline in validation. Development gains (≈ +$39k R and O, ≈ +$120k G) rest on few GDX trades
  and added nothing in 2025–2026; the descriptive fold repeats trailed every baseline.
- **Validation:** `results/validation/validation.json` `cc06deae3fa6232c2204c5a6adba49f9b1f055adbead9e6c079424fe6b90f229`
  (committed `4b616ba5`); 39/39 pass V1–V3; known targets of C4, C4-refined and VG #2 native reproduced to the cent.
- **Full `npm test`** (unit `c4gdx-npm-test` in `c4gdx.slice`, PATH set; 15:55:22Z → 15:59:29Z): 1,382 tests, 1,371
  pass, 7 fail, 4 skipped — exactly the 7 known pre-existing failures (intraday-study ×1, minute-optimizer ×1,
  trailing-buy ×4, study7-runners ×1); this study added 9 passing tests. No regression.
- **Follow-up gate:** the user's review of `REPORT.md`. Nothing further is started (next in the roadmap: 4A).
- **Authority:** `PROTOCOL.md` `1307e46a…bcf1`, frozen by `results/protocol-freeze.json` `5c40244e…c8a275`
  (2026-11-10T13:23:18Z; closure 254 files unchanged since); `AMENDMENTS.md` R1–R3 (pre-freeze; none after);
  adoption 2.0.0. Commits: `e66fe6b7` pre-freeze, `f2cd47a9` freeze, `bf2ac4df` / `0e738299` / `37c70094` fold
  selections, `41a2a5c3` development records + `FROZEN_SELECTION.json` (`ef1da770…031e`), `4b616ba5` validation.
- **Nothing is running.** The chain ran 13:23:25Z → 15:47:39Z; the validation 15:48:15Z → 15:49:10Z.

## Environment

- Repository root `/home/chad/projects/margin-trading`, branch `research/c4-gdx-growth-partner` from `84ae46b3`; nothing
  committed at the start (see Authority for the study's commits). Node v24.21.0; host 8 cores / 16 threads, 59 GiB.
- Code `src/c4-gdx-growth-partner/` (`npm run c4gdx -- <command>`), tests `tests/space.test.ts` (9 pass), tables
  `tools/c4-gdx-growth-partner/tables.ts`. Reuses Priority 3's engine unchanged, 5A's subject loader, 3A's observer and
  tail statistics, 3B's configuration (its instrument for E3 and the report-only "archived instrument").
- Canonical data verified 2026-11-10 (`npm run c4gdx -- doors`): the Priority 3 pins, endpoint 2026-10-30.

## Bench (engineering only; `.cache/c4-gdx-growth-partner/pilot/bench/`)

- D24, 384 random GDX centres (128 per arm) with 16 whole-portfolio neighbours each (6,528 evaluations), book cache 1,024:
  12 workers 135.2/s (7.7 GiB), **14 → 135.4/s (9.0 GiB, chosen)**, 16 → 133.4/s (10.2 GiB). Plausible random centres:
  R 74/128, O 47/128, G 40/128. In-process: a GDX Growth book ≈ 35 ms, the pooled replay ≈ 6–15 ms.

## Decisions (in the draft protocol)

- Arms R (lead), O, G; base new GDX proposals per cutoff 16,384 / 4,096 / 4,096 (cap 2×); same schedule at C19, C21,
  C23, C24; seeds provenance-restricted per cutoff (Appendix A only at C24); scopes whole-portfolio and GDX-only;
  gates Q1–Q7; per-arm actual-profit primary; partner candidate and prudent recommendation; transfers at C24.
- Departure D1 (no independent lane; descriptive fixed-anchor repeats) cites the brief's own wording.

## Do not rerun / guards

- Never modify a completed study's code or records. Pilot jobs carry `--pilot NAME` (job names `pilot-NAME-…`).
- The control manifest and the archive audit are sealed: never rerun them.

## Stage log (continued)

| Stage | Record | sha256 | Wall | Fresh evaluations |
|---|---|---|---:|---:|
| Validation (FULL, once) | `results/validation/validation.json` | `cc06deae3fa6232c2204c5a6adba49f9b1f055adbead9e6c079424fe6b90f229` (committed `4b616ba5`) | 55 s | 1,280 (paired neighbourhoods) |

Totals: 1,566,093 fresh evaluations (searches 1,280,668; qualifications 245,167; transfers 38,978; validation 1,280);
116,928 new GDX centre proposals (R 71,936; O 20,928; G 24,064). Peak job cgroup 10.3 GiB (C24 search), 10.9 GiB
(validation); no memory event.

## Disclosures for the report

- R1 (pilot hang from duplicate in-flight keys; fixed before the freeze), R2 (caps, header), R3 (formatting only).
- Four lane-cutoffs reached their extension cap with a trigger firing (G/seeded C19, C23, C24; O/seeded C23):
  budget-bound there.
- Validation is on previously examined history; anchors and Appendix A were chosen with 2025–2026 in view.
