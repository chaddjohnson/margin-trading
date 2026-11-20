# gpu-phase5 — amendments to the frozen protocol (append-only)

`PROTOCOL.md` is frozen by `results/protocol-freeze.json` (its sha256). It is never edited; every change after the freeze is
recorded here with its ID, UTC time, the change, why, which results existed and its effect. No gate, tolerance or decision
rule is loosened after results it governs exist.

## A1 — 2026-11-20T22:56Z: the fresh-context loop stopped at its first capture; the reproduction continued with dedicated instruments (no rule, gate or tolerance changes)

- **What happened:** the fresh-context loop (§4.5 item 2; `results/rootcause/fresh-loop-p4/`) captured a CPU-reference
  transient in its cycle 16 (an envelope mismatch with equal books, pool and record hashes; the GPU value equal to every
  re-evaluation). I stopped the loop gracefully after 36 cycles (432 fresh CPU workers, 36 fresh GPU contexts) instead
  of running it to the planned minimum (2,000 workers, 150 contexts) on the unfixed configuration, because the capture
  gave an exact arithmetic lead that dedicated instruments could dissect far faster.
- **Instruments added** (all within §4.3 H3/H4 and §4.5 items 3–4; each is a tool of `tools/gpu-phase5/`, writes only
  under `results/rootcause/`, and changes no engine file): `diag-envelope.ts` (which pair of path values gives the
  captured wrong number exactly), `envelope-stress.ts` (cold processes running CPU worker 0's first chunk, the path kept
  and inspected), `v8-alias-repro.ts` and `alias-hunt.ts` (synthetic variants; neither triggers), `record-stress.ts`
  (cold processes running worker 8's chunk, three passes, compared with a `--no-maglev` ground truth), `host-soak.ts`
  (fresh host pipelines decoding one real device response of the original batch).
- **Consequence for the budget:** the loop's minimum (≥ 2,000 fresh CPU workers and ≥ 150 fresh GPU contexts, original
  first chunks and original batch) is run in full on the FIXED configuration as part of gate A3 (§7), where it must
  show zero mismatches; the unfixed configuration's evidence is the stress experiments' (their concurrency is stated
  with every figure). §4.7's rule is unchanged and is applied to that evidence.
- **Results that existed:** the loop's 36 cycles and the stress runs up to 22:52Z (`envelope-stress-*.json`,
  `record-stress-{default,no-maglev}.json`, `host-soak-default-full.json`).
- **Disclosure:** the first `record-stress` pair compared each pass with the process's own last pass; in the three
  processes with wrong evaluations the last pass was wrong too, so its per-part counts are relative. The tool now
  compares every pass with a fixed ground truth (one `--no-maglev` child, self-consistent, equal to Phase 4's own
  diagnostics for the original candidate); the rerun is `record-stress-truth-*.json`. The first pair's files are kept.
