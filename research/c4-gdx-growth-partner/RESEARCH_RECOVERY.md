# RESEARCH RECOVERY — Priority 3C: fixed-anchor GDX Growth partner search (C4-refined, C4, VGT #4)

## Top screen

- **Updated:** 2026-11-10T12:51Z (UTC). **Status: INCOMPLETE — engineering pilot (pre-freeze).**
- **Authority:** `brief/BRIEF.md` sha256 `c98a3e42e8c24849102d4d7882aa10d3dd5de24613830d9c2184cb7f68815b4d` (read in full).
  Protocol: `PROTOCOL.md` DRAFT sha256 `475a055d…f477` (not frozen); adoption `STANDARD_ADOPTION.json` `dad05751…7f48`
  (standard 2.0.0, preflight PASS 12:47Z). No amendments yet.
- **Sealed (results/seals.jsonl):** `CONTROL_MANIFEST.json` `0c81f3f0dc3e8b5c98582a99148bca8cfefcd4e4eeb9799eeb1f48f8fdbebf3f`
  (12:39:08Z); `results/audit/archive-audit.json` `0a7a3c4447c892304c25915a4dd8a28c0bb703d794fac7ea8b953b9f8c4000b2`
  (12:39:30Z; 22 archives, 5 exact-anchor matches all re-evaluated identically, 0 new archive seeds).
- **Running:** the pilot reference chain `bash research/c4-gdx-growth-partner/chains/pilot.sh ref` (harness background
  task; units `c4gdx-pilot-ref-*` in `c4gdx.slice`; logs `results/logs/c4gdx-pilot-ref-*.log`; outputs
  `.cache/c4-gdx-growth-partner/pilot/ref/`). Check: `systemctl --user list-units 'c4gdx*'`.
- **Next:** pilot interrupt tests (`chains/pilot.sh interrupt`) → engineering gates (`npm run c4gdx -- launch --unit
  c4gdx-parity --wait -- parity`) → finalize the protocol (R amendments for any pre-freeze change) → readopt → preflight
  → commit → `freeze-protocol` → commit → study chain.

## Environment

- Repository root `/home/chad/projects/margin-trading`, branch `research/c4-gdx-growth-partner` from `84ae46b3`; nothing
  committed yet on the branch. Node v24.21.0; host 8 cores / 16 threads, 59 GiB.
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
