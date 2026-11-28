# Transition: readiness proposal → authorized protocol NL0-REP 1.0.0

The readiness assignment (`research/gpu-phase7/`, commit `d5fddf26`, READINESS_MANIFEST.json `pilot.executionAuthorized:
false`) left a reviewable **proposal** in this namespace. The user's authorization (`brief/BRIEF.md`, sha256
`5a9dfe8f68d227be2dd429508691bf65574df6a975fa104e5d05c27e747723dd`, received 2026-11-22) approved decisions D-0 … D-14
with two refinements (D-8 both RA1 variants; D-12 expanded) and removed the proposed 450k stop rule (D-2).

The proposal's four documents were moved — byte-identical, never edited — into `history/2026-11-22-readiness-proposal/`
(`git mv`; their sha256 equal the READINESS_MANIFEST.json `deliverables` / `support` entries):

| Proposal file | sha256 (unchanged) | Superseded by |
|---|---|---|
| `PROTOCOL_PROPOSED.md` | `4f7c215fd586c7c4ec0f119b510e949da4ad9961a6c5a29fdd790f03cc4966d0` | `PROTOCOL.md` (NL0-REP 1.0.0, frozen by `results/protocol-freeze.json`) |
| `DECISION_REGISTER.md` | `c74390d2674683852556b446db9fca5f97cd94ea97081b5a319300551be33122` | `DECISION_REGISTER.md` (resolved, with provenance) |
| `EXECUTION_PLAN.md` | `bd118e23d55a72f3694d77ae9a02bbb3df571fafe047d90eeaf5e6c14adf1f1b` | `EXECUTION_PLAN.md` (the executable plan) |
| `README.md` | `0f4480705f0cdb78420668ad2fe3a5ed1b6511a4ac835087f4c55a6a1c52d482` | `README.md` |

`DIAGNOSTICS_SPEC.md` (`c722bc11…`), `SCALING_CHECKS.md` (`55677725…`) and `IMPLEMENTATION_PLAN.md` (`64f154d9…`) stay in
place unchanged: they are referenced (and pinned) by the new protocol. Every difference between the proposal and the
frozen protocol is listed in `PROTOCOL.md` §0.3 and recorded before any outcome in `AMENDMENTS.md` (P1–P9).
