# RESEARCH_RECOVERY — walk-forward robustness failure investigation (New L0 family)

## Top screen

- **Updated (UTC):** 2026-11-13T19:12Z
- **Status:** **COMPLETE** — diagnosis and recommendations delivered (`REPORT.md`); nothing adopted, deployed or changed in
  any strategy, allocator, threshold, standard or NL0 1.0.0. Commit and push of `research/vg-l0-walk-forward-diagnostic`
  recorded below.
- **Brief:** `brief/BRIEF.md` sha256 `fb939d2596623cdbc6abd83493f01343097d800d6f124e199fa699376a818d3e` (140 lines by
  `wc -l`, no trailing newline; read in full, final section present).
- **Protocol:** `PROTOCOL.md` sha256 `e88b3ef5dc101009f74efc989aa08471434b6961afbbd7ebb9e1536183d29bb3`, frozen by
  `results/protocol-freeze.json` (`f0347cd5…`), committed `4ee66fc4` before any replay. Amendments (`AMENDMENTS.md`,
  sha256 `c6a8de6b…`): A1 (caps D7 4,000 / total 5,000; D6 source; dry runs in-process), A2 (D9 regimes), A3 (D10
  coverage check, hindsight). Standard 2.1.0, scope diagnostic; preflight PASS (2026-11-13T19:12Z).
- **Running processes:** none. The temporary session worktree was removed (`git worktree list` shows only the main
  checkout).
- **Next step (needs the user):** review `REPORT.md` §6 (ranked recommendations) and the proposed standard 2.2.0
  (report-only) amendment; decide whether and how the TSLA/MSFT studies and the Strategy Lab chart fix proceed. Nothing
  starts automatically.

## Environment

- Main checkout; branch `research/vg-l0-walk-forward-diagnostic` from `73712149` (tip of `research/vg-l0-shadow-eligibility`).
- Node v24.21.0; systemd units in `vgwfd.slice` (MemoryHigh 44G / MemoryMax 48G / swap 0); absolute node path
  `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Scripts: `tools/vg-l0-walk-forward-diagnostic/` (common, freeze, gates, episodes, core, replay, replay-ses, selection,
  d8, neighbours, alternatives, regimes, coverage, tables). No `src/` change. `docs/research/ROADMAP.md` gained row WF.

## Stages (all complete; sealed records verify against `results/seals.jsonl`, 10/10)

| Stage | Command (repo root; RUN_COMMANDS.md) | Output | sha256 | Simulations |
|---|---|---|---|---:|
| S1 protocol freeze | `freeze.ts` | `results/protocol-freeze.json` | `f0347cd53d47a5024df11de428d22998e721366ca0953e9e973de6b8c6785260` | 0 |
| G1/G2/G4 + D2 | `gates.ts` | `results/gates/gates.json` | `46cba3c7f29b077b8a0c038319bb167f3ad026b080664117788b77f32141a5d9` | 0 |
| D3/D4/D8/G3 primaries | `replay.ts` (unit) | `results/replays/primaries.json` | `2c3483689c04d4a3639e59d8e7fd8289eb1e31b2beeca2e8880481d91a425492` | 71 (+129 dry) |
| Session replays | `replay-ses.ts` (unit, worktree `18674b39`) | `results/replays/session.json` | `c6e6f50f5a535100e3b26c9e7208fc1d1716a68636f64c24da3bf9b74e5b584f` | 21 (+21 dry) |
| D5 selection trace | `selection.ts` | `results/selection/selection.json` | `1d24f8610a03d2a5…` | 0 |
| D8 checks | `d8.ts` | `results/gates/d8.json` | `152671ebf0041308…` | 0 |
| D7 neighbourhoods | `neighbours.ts` (unit) | `results/neighbours/selection-neighbourhoods.json` | `ba96f3e6df0df208…` | 3,072 (+768 dry) |
| D6 evaluated rows | `alternatives.ts` (unit) | `results/replays/evaluated-rows.json` | `634259caec15835e…` | 172 (+58 dry) |
| D9 regimes | `regimes.ts` | `results/regimes/regimes.json` | `5ff540ec178b4286…` | 0 |
| D10 coverage | `coverage.ts` (unit) | `results/coverage/newl0-at-c21.json` | `4a9c7b7948ff2e5a…` | 386 |
| Tables | `tables.ts` | `results/tables/*.md`, `summary.json` | regenerated (not sealed) | 0 |

Total fresh simulations 4,698 (cap 5,000, A1); development doors only; FULL never opened.

## Deliverables (sha256)

| File | sha256 |
|---|---|
| `REPORT.md` | `05e65e38490536c5258ce51457abbc3ccaaeb2719038c3f561911007a9d9335d` |
| `README.md` | `2b5a00519ad51dee18fb4acf6149588ee56276640398fc0a3b3365ad8d19b593` |
| `RUN_COMMANDS.md` | `be8376ce421072a690dd7da5547160914b9c4bc5ad735763bafca4f52b9f253e` |
| `results/tables/audit.md` | `4c2303daa0a97238a5a704e1216816a0d8b91aadac8a2af1e75aa276d24d5fb8` |
| `results/tables/chronology.md` | `aa1af71236193de5574da69eba8b8907ca55a496293a01ca9fe743389239e5a9` |
| `results/tables/selection.md` | `7dad468f41931293450e5ead0bfaf55d3ad3c0bed7eac69b131527bc24041e33` |
| `results/tables/neighbours.md` | `2f5ea94e6a0cb93aa390987bfe10dfb3bc2adedc0088b78656b8c3fa7a734ce0` |
| `results/tables/summary.json` | `05becb46f5b1c834e29c63753ed98b38af28ecfa097fc82e188b5cf341609baa` |

## Results (sealed; narrative in REPORT.md)

- Anchors reproduced to the cent: 5B L0 −$29,358.01 / DD $67,214.22; session +$25,237.54 / $58,866.62; B1 +$71,407.39 /
  $80,475.04; B2 −$11,516.74 / $74,307.21. Every breach is in the 2020 crash or the 2022 bear.
- Gates: G1 36/36, G2 digests equal (Priority 3, 5B, shadow; session at its commit), G3 190/190 replays equal their sealed
  records, causal prefixes 12/12, G4 4/4, D7 parity 12/12. No software defect.
- Hypotheses (REPORT §4.2): H1 directly verified/strongly supported; H2 strongly supported; H3 instability verified,
  narrow optima not supported; H4 mechanism verified; H5 directly verified; H6 not primary; H7 strongly supported
  (coverage part hindsight); H8 not supported.

## Disclosures

- Dry runs ran in-process (≤ 1.9 GB, < 25 s each); sealing runs in units (A1).
- A2's heading time was first typed by hand and corrected to the clock reading (18:57:51Z) before commit.
- D10 uses New L0 (chosen with later data) as a hypothetical C21 member: coverage evidence only, never a selectable result.

## Guards

- Do not rerun sealed stages (they refuse). Do not edit audited studies' files. No standard or NL0 edit without the user.
