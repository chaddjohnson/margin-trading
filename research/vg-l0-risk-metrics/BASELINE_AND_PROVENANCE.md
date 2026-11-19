# BASELINE_AND_PROVENANCE — Stage 0

Sealed record: `results/baseline/parity.json` (sha256 `83e610b9e1b9168a3070d3f96bfa6738fcb9730d639c2a77abddc49158bf69f8`),
gate **G0 PASS**. Everything below is read from sealed files whose sha256 was verified before use.

## 1. Repository state and isolation

| Item | Value |
|---|---|
| Branch | `research/vg-l0-risk-metrics`, created in the main checkout (no worktree; the user's standing preference) |
| Base | `67b4ae711bea141bbd721d78bb08fb3a2f07a977` = `origin/research/vg-l0-full-joint` (Assignment 3's verified tip, which contains `main` = `108c241b`) |
| Upstream check (2026-11-18T05:22Z, `git fetch`) | `main`, `research/vg-l0-full-joint`, `research/vg-l0-risk-families` and `fix/strategy-lab-drag-measure` (8ded3004, the drag-to-measure fix) equal their remotes; nothing new upstream |
| Other work | the working tree was clean; no other session, unit or job was running; no other branch was touched |
| Data | git-ignored canonical minute files read in place through Priority 3's verified loaders (no copy, no symlink) |
| Code footprint | only new files: `src/vg-l0-risk-metrics/`, `tools/vg-l0-risk-metrics/`, `research/vg-l0-risk-metrics/`. No engine, study, standard, method or `package.json` file changed. |

## 2. Authorities and pins (all verified)

| File | sha256 | Check |
|---|---|---|
| `docs/research/OPTIMIZATION_STANDARD.md` | `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24` | = registry 2.2.0 (current) |
| `docs/research/methods/NEW_L0_METHOD.md` | `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4` | = registry NL0 1.0.0 |
| `research/vg-l0-full-joint/FROZEN_SELECTION.json` | `4080d4b1ca4db93296876f009307ce7cd055e1ab04f16133f7761c40a288f2d7` | sealed (0444), committed |
| `research/vg-l0-full-joint/results/validation/validation.json` | `05cddeebad2142f44bfab156860406adbaf697f041a8432c671cfef5b71a5408` | sealed |
| `research/vg-l0-full-joint/results/folds/sequential.json` | `140583e8466503b0e831024844640b4bb4dcc2fb274191fce2a648ec9e702a5b` | sealed |
| `research/vg-l0-risk-families/FROZEN_SELECTION.json` | `4174ae535ca25dd96a86c06d22420a8ce685ffcabb643e2e04f764211938a143` | sealed |
| `research/vg-l0-risk-families/results/validation/validation.json` | `730dc7802c9852343fc163077d80d569dd358fd4390f678efb6d2e0569e31655` | sealed |
| `research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json` (5B) | `cd223a0d18c44925af7102b98efae1e369899664b8fb07ee2f8a579816255793` | NL0 §2 pin |
| `research/vg-d1-growth-joint/FROZEN_SELECTION.json` (Priority 3's FULL guard) | `e29e35e290c1f9a424410b02c048889021fa818f16c324085bae8bf5bdcebfe2` | Priority 3's pin |
| `data/VGT/data.csv` | `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e` | Priority 3's canonical pin |
| `data/GDX/data.csv` | `77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049` | Priority 3's canonical pin |
| `data/VOOG/data.csv` (margin overlay only) | `1699c89f83fe44c1ea4e3f3a51ee62c78d9e0567be5b731009c1f47352c55732` | recorded |

Seal logs re-verified (every file's sha256 against its `seals.jsonl`): Assignment 3 **47/47**, Assignment 2 **47/47**, 5B
**28/28** (`npm run vg-l0fj -- verify`: "47 sealed record(s) verify", re-run 2026-11-18T06:18Z).

Doors (Priority 3's loaders, door log silenced; this study's `results/doors.jsonl` logs every opening): FULL 2,723
sessions 2016-01-04 → **2026-10-30** (the common complete endpoint; VGT 8:1 forward-adjusted on 2026-04-21); D24 2,264
sessions → 2024-12-31; D19/D21/D23 for the folds. Trade-ledger schema: Priority 3's `Lot`/`LotFill`
(`src/vg-d1-growth-joint/pool.ts`), mapped field by field in `src/vg-l0-risk-metrics/ledger.ts`.

## 3. The frozen New L0 reference — reproduced exactly

Identity: 5B `C24/L0/informed/R1#1 profit`, cfg `67cfdd9b62d1e16f`, Priority 3 quad `a2e385640ca61012`, Growth·VGT
`6b5f909b30cfa516`, read from 5B's sealed R01 (identity-checked by Assignment 3's `incumbents()`). Economics unchanged:
one $100,000 slot, 5 bps per side, 11% simple interest by calendar day, original fills and corporate-action handling.

| Anchor | Published | Reproduced | Equal |
|---|---:|---:|:---:|
| FULL net | $479,605.18 | $479,605.18 | yes |
| FULL maximum minute DD | $20,385.99 | $20,385.99 (2026-06-17 → 2026-07-17) | yes |
| FULL funded lots | 46 | 46 | yes |
| FULL realized / unrealized | $485,169.93 / −$5,564.76 | same | yes |
| Ledger signature | `7b17578108747911` | `7b17578108747911` | yes |
| Development (D24) net / DD / lots | $382,721.46 / $19,459.83 / 34 | same (2023-01-25 → 2023-02-24) | yes |
| 2025–2026 P&L / reset DD | $96,883.72 / $20,385.99 | same | yes |
| Causality: D24 net = FULL marked net at the 2024-12-31 close; D24 DD = FULL DD through then | — | yes / yes | yes |
| Rebuilt ledger = engine | — | 458,837 (D24) and every FULL minute-mark change, DD and its instants, every lot's net, MAE and best mark | yes |
| Determinism | — | a second FULL replay gives the identical ledger hash | yes |

## 4. N/original — a research finalist, not the adopted benchmark

Identity: `C24/informed/GD.VB/R2#1 profit`, cell **GD1.VB0** (D1·GDX family D — protective stop 15.9%, adaptive hold
28 days at 7.0% progress, decline gate ON K = 3, r = 70%, c = 60 sessions; D1·VGT family B — protective stop 12.0%,
calendar hold), Assignment 3 Track N: **incumbent-informed; no independent chronological test**.

| Figure | Expected (brief) | Sealed / reproduced |
|---|---:|---:|
| FULL net / DD | $482,700.73 / $20,385.99 | $482,700.73 / $20,385.99 |
| 2025–2026 P&L (New L0) | ≈ $94,669.70 ($96,883.72) | $94,669.70 ($96,883.72) |
| Development net / DD | — | $388,031.02 / $19,459.83 (= its C24 evidence) |
| Lots | — | 44 (32 on development) |

Differences from New L0 (parameter level): D1·GDX trailing buy Y 0.1% → 0.2%, buffer 2.5% → 2.4%; D1·VGT Y 0.9% → 0.2%,
L 72 → 70 sessions; the RC controls above (New L0 has none); Growth·VGT differs only in three inputs that are
behaviourally inert or near-inert on this history (recovery retracement 46.2 → 44.9, classic pullback 11.5 → 11.2,
classic rebound 3.01 → 2.96; same Growth trades).

## 5. Every other audited subject

All 51 audit subjects (New L0, Assignment 3's 48 frozen finalists, Assignment 2's C24 primaries F/RA1 `GD0e.VC0`,
F/original `GA0.VB1e` and L/original — the last three with New L0's Growth·VGT, as Assignment 2 froze it) reproduce
their sealed FULL net, DD, lots, 2025–2026 P&L and reset DD to the cent (`results/audit/centres.json`, every row
`parity: true`). Assignment 2's rows replay through the same RC 2 path (their identities are RC 2's).

## 6. Labels used throughout

- **Previously examined history:** all of 2016-01-04 → 2026-10-30; 2020, 2022 and 2025–2026 repeatedly. Every
  comparison here is retrospective.
- **Informed / no independent chronological test:** New L0, N/original, N/RA1, every Track N member, C4, C4-refined.
- **Independent (C24 evidence):** Assignment 3's Track I members; only L/RA1's procedure was chronologically supported.
- **Conditional:** Assignment 2's rows (Growth·VGT frozen at New L0's, chosen with later data).
