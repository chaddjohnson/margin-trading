# A3 C19 broad1 GPU replay — run 1 (timing sample; lossy encoding)

Run 1 (2026-11-19 01:43:12Z → 02:03:01Z, unit `gpup2-a3-c19b1`, final binary 3fe09e67…): 1,242,714 fresh GPU
evaluations, 7,607 archive hits (both equal to the sealed record), wall 1,132.5 s versus the sealed CPU run's 5,900.8 s
(5.21×), CPU-scored 0, no failure.

Its `result.json` was written with plain `JSON.stringify`, which turns ±Infinity/NaN into `null` (the sealed records
use the store's `"__Inf"`/`"__-Inf"`/`"__NaN"`). The comparison (`../compare-a3-C19-broad1-run1-lossy-encoding.json`)
therefore failed on 91 fields — a full walk showed every one of them is such a non-finite value (sealed string vs
`null`) and nothing else differs. Because `null` cannot carry the sign, this run is NOT identity evidence; it is kept as
the first end-to-end timing sample. Identity is established by run 2 (`../a3-C19-broad1/`, written with the encoding)
after `src/gpu-phase2/context.ts` writeJson and the mini-optimization row hashes were fixed to encode non-finite values.
