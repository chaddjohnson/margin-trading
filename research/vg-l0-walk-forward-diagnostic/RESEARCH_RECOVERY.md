# RESEARCH_RECOVERY — walk-forward robustness failure investigation (New L0 family)

## Top screen

- **Updated (UTC):** 2026-11-13T19:00Z
- **Status:** **INCOMPLETE** — all diagnostics D2–D9 sealed (commit `819cab00`); next: tables script, REPORT.md,
  final checkpoint, commit, push, worktree removal.
- **Brief:** `brief/BRIEF.md` sha256 `fb939d2596623cdbc6abd83493f01343097d800d6f124e199fa699376a818d3e` (140 lines by
  `wc -l`, no trailing newline; verified complete).
- **Protocol:** `PROTOCOL.md` sha256 `e88b3ef5dc101009f74efc989aa08471434b6961afbbd7ebb9e1536183d29bb3`, frozen by
  `results/protocol-freeze.json` (sha256 `f0347cd53d47a5024df11de428d22998e721366ca0953e9e973de6b8c6785260`), committed
  `4ee66fc4`. Amendments A1 (caps: D7 4,000, total 5,000; D6 source; dry runs in-process) and A2 (D9 regimes).
  Standard 2.1.0 (scope diagnostic), preflight PASS. Fresh simulations so far: 4,312 (cap 5,000).
- **Running processes:** none.
- **Next command:** write `tools/vg-l0-walk-forward-diagnostic/tables.ts` (records → `results/tables/*.md`, no
  simulation), then REPORT.md. The session worktree still exists (remove at the end:
  `git worktree remove --force <scratchpad>/wt-ses`).

## Environment

- Main checkout; branch `research/vg-l0-walk-forward-diagnostic` from `73712149` (tip of `research/vg-l0-shadow-eligibility`).
- Node v24.21.0 (`.node-version`); absolute node path for systemd units:
  `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Scripts: `tools/vg-l0-walk-forward-diagnostic/` (common, freeze, gates, episodes, core, replay). Not in `src/`.
- `--dry` writes unsealed copies to `$WFD_SCRATCH/dry/...` (session scratchpad), for checks before sealing.

## Stages

| Stage | Status | Command (repo root) | Output (sealed) | sha256 |
|---|---|---|---|---|
| S0 setup | complete | — | brief, branch | — |
| S1 protocol freeze | complete (18:38Z) | `node … tools/vg-l0-walk-forward-diagnostic/freeze.ts` | `results/protocol-freeze.json` | `f0347cd5…` |
| G1/G2/G4 + D2 | complete (18:39Z; 3.5 s, 1.3 GB in-process) | `node … gates.ts` | `results/gates/gates.json` | `46cba3c7f29b077b8a0c038319bb167f3ad026b080664117788b77f32141a5d9` |
| D3/D4/D8/G3 primaries (5B, B1, B2, NL0) | complete (18:44Z; unit `vgwfd-replay-primaries`, 16 s, peak 1.6 GB; 71 simulations) | `systemd-run … replay.ts` | `results/replays/primaries.json` | `2c3483689c04d4a3639e59d8e7fd8289eb1e31b2beeca2e8880481d91a425492` |
| Session replays (G3, D3, D4) | complete (18:46Z; unit `vgwfd-replay-session`, 15 s, 1.8 GB; 21 sims) | `WFD_SES_WT=… replay-ses.ts` | `results/replays/session.json` | `c6e6f50f5a535100e3b26c9e7208fc1d1716a68636f64c24da3bf9b74e5b584f` |
| D5 selection trace (records) | complete (18:53Z; in-process) | `selection.ts` | `results/selection/selection.json` | `1d24f861…` (seals.jsonl) |
| D8 checks (jumps, holds, reconciliation) | complete (18:53Z) | `d8.ts` | `results/gates/d8.json` | `152671eb…` |
| D7 selection neighbourhoods on slices | complete (18:55Z; unit `vgwfd-neighbours`; 3,072 sims; parity 12/12) | `WFD_SES_WT=… neighbours.ts` | `results/neighbours/selection-neighbourhoods.json` | `ba96f3e6…` |
| D6 evaluated rows (172) | complete (18:56Z; unit `vgwfd-evaluated-rows`, 35 s, 3.7 GB; 172 sims; G3 0 failed) | `WFD_SES_WT=… alternatives.ts` | `results/replays/evaluated-rows.json` | `634259ca…` |
| D9 regimes (A2) | complete (18:58Z) | `regimes.ts` | `results/regimes/regimes.json` | `5ff540ec…` |
| S5 report, tables, commit, push | not started | | | |

Resume semantics: every stage is a deterministic replay of sealed configurations; a sealed output refuses to be rewritten.
A stage interrupted before sealing is simply rerun (no partial state). Gates passed: G1 36/36, G2 3/3 digests equal,
G3 12/12 records field-for-field + 9/9 causal prefixes (training door = sealed selection centre), G4 4/4.

## Findings so far (on disk in the sealed records above; analysis not yet written)

- Every audited path has exactly two breaching episodes: Feb–Mar 2020 crash ($39.5k–$55.4k, C19 slice) and the 2022
  bear (peak 2020-09-10 / 2021-11-22 / 2022-01-04 → trough Sep–Oct 2022; $58.9k–$80.5k; unrecovered by 2024-12-31).
- 2022: the C21 primaries carried one lot bought near the 2020 bottom across the cutoff, marked at +$73k (5B), +$127k
  (B1), +$120k (B2) at 2021-12-31 (≈ 33–53% of their training net); −$24k/−$35k/−$34k given back in January 2022; then
  strings of max-hold D1 losses. New L0 carried +$10k.
- D1 lots: net-profit stop policy → no loss stop before the maximum hold (engine `src/shared-margin-portfolio/strategy.ts`
  `isStopActive` / `evaluate`).

## Running work

- None. Temporary worktree: `/tmp/claude-1000/-home-chad-projects-margin-trading/de8b0eea-b9c7-4e2d-9d62-dc92d2add80c/scratchpad/wt-ses`
  (detached at `18674b39`, door copies, `node_modules` symlink); remove at the end.

## Guards

- Do not rerun sealed stages. FULL never opened. Do not edit audited studies' files. Remove the session worktree at the
  end (`git worktree remove`), never commit from it.
