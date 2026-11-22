# RESEARCH_RECOVERY — risk-envelope pilot (NL0-REP 1.0.0) — INCOMPLETE

**Top screen (times from `date -u`)**

- Updated: 2026-11-22T10:33Z. **INCOMPLETE.** Stage: **S1 — engineering gates** (E4 PASS 26/26, E5 PASS, E1 VERIFIED;
  E3 chain running; E6, gates seal, freeze not yet). No official pilot evaluation has run.
- Authority: `brief/BRIEF.md` sha256 `5a9dfe8f…723dd`; protocol `PROTOCOL.md` NL0-REP 1.0.0 (not yet frozen; sha256 at
  commit `1f5093d6`: `723eea5d96fb986bb3d285b62201895052d573b2e6154a6fe94e8302c5ef2e78`); amendments head P9 (pre-freeze).
- Branch `research/vg-l0-risk-envelope-pilot`, HEAD `1f5093d6` (code + documents committed; not pushed yet). Main checkout.
- Running: unit `vgl0rep-eng` (`chains/engineering.sh`, log `results/logs/engineering-chain.log`): E3 steps 4–16
  (stopped/killed resume, compares, a3check, edge D21/D24, identity, summary). Resume after a failure: `START=<step>`.
- Next: E6 official preflight D21/D24 → `npm run vg-l0rep -- gates` → `freeze` → commit → push → official stage 1
  (EXECUTION_PLAN §2).

## Environment (verified 2026-11-22T09:52Z)

| Item | Value |
|---|---|
| Node | v24.21.0 (`.node-version` 24.21.0); every evaluating process `node --no-maglev` |
| GPU | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, 763 MiB used / 31,346 MiB free, idle |
| Jobs | none running (no research unit, no node study runner) |
| Disk | 624,335,704,064 B free on / |
| Acceptance | `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED); out-of-band pin `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json` |
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` 3.0.0 sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` (= registry current) |
| Reference method | NL0 1.0.0 sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4` |
| Data | GDX `77dba9b21c4b6849…`, VGT `2ee06310f2fa8926…` (Priority 3 pins) |

## Proposal files at the start (Phase 7 readiness package; byte-identical to READINESS_MANIFEST.json)

| File | sha256 |
|---|---|
| PROTOCOL_PROPOSED.md | `4f7c215fd586c7c4ec0f119b510e949da4ad9961a6c5a29fdd790f03cc4966d0` |
| DECISION_REGISTER.md | `c74390d2674683852556b446db9fca5f97cd94ea97081b5a319300551be33122` |
| EXECUTION_PLAN.md | `bd118e23d55a72f3694d77ae9a02bbb3df571fafe047d90eeaf5e6c14adf1f1b` |
| IMPLEMENTATION_PLAN.md | `64f154d9d46437e53b5fdd5868a75b76c2c2f53b96f9b1f40a784da35523cdaa` |
| DIAGNOSTICS_SPEC.md | `c722bc11918a10d87d2cdb6bca2f4d3dde8516257e467bd0dd0abdd10c6e5172` |
| SCALING_CHECKS.md | `55677725998e0f23ad632274930d7b8c9a1d44d4a384b9853ffd75cf1864b8f1` |
| README.md | `0f4480705f0cdb78420668ad2fe3a5ed1b6511a4ac835087f4c55a6a1c52d482` |

## Verified facts so far (from files)

- Hash-selected cell: min over the 63 non-legacy cells of sha256("vg-l0-risk-envelope-pilot/cell/" + id) = `GB0.VD1`
  (`0260e9f0…`); both pilot cells are in Assignment 3's `broad1` part.
- Sealed Assignment 3 CTRL lane `requested` (research/vg-l0-full-joint/results/search/*/broad1.json): C21 GA0.VA0 R1
  12,946, R2 18,170, GB0.VD1 R1 15,685, R2 24,513 (= 71,314); C24 8,584, 19,922, 16,933, 17,049 (= 62,488).
- Assignment 3's per-lane worst case (budgets.ts laneWorstCase, broad) = 40,642 → per-lane cap 41,000.
- N/original = Assignment 3 `FROZEN_SELECTION.json` finalist `C24/informed/GD.VB/R2#1 profit` (`rc1-f1a8b57cb02455c3`,
  cell GD1.VB0); FROZEN_SELECTION sha256 `4080d4b1ca4db93296876f009307ce7cd055e1ab04f16133f7761c40a288f2d7`.

## Guards

- No official pilot evaluation before: protocol freeze sealed + committed + pushed, E1–E6 passed and sealed.
- Never edit Assignment 3 / Assignment 2 / Priority 3 / Phase 7 source or sealed records; never merge or push `main`.
- D23 opens only after the sealed and committed C21 selection; FULL once, only after the sealed and committed C24
  selection and the door authorization record.
- Budget: ≤ 700,000 requested pilot research evaluations (deterministic bound verified before the first search).
