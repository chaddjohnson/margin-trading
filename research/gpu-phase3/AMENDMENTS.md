# gpu-phase3 — amendments to the frozen protocol (append-only)

`PROTOCOL.md` was frozen 2026-11-19T14:21:42Z (`results/protocol-freeze.json`, sha256 of the protocol
`952da32c89dadbb39733953983e4cbb4c2206ea9b53161bc255784a68fe11a1b`). It is not edited; departures are recorded here.
No gate, tolerance or decision rule was changed.

## A1 — 2026-11-19T21:21Z: the negative and tamper suites rerun after an enforcement-only change

- **What changed after the final campaign:** the repository suites (H7, 21:05–21:16Z) found a root TypeScript error in
  a test this study added (`src/gpu-backend/tests/policy.test.ts`, the type of an env-object array). It was fixed in
  `0f1bab17` (a type annotation only; the test's behaviour is unchanged). The file is in the acceptance's pinned
  enforcement group, not in the binary's evaluation digest (`30824182…` unchanged), so §10's "on the final binary and
  tree" means the enforcement evidence must hold for the changed tree too.
- **What is done, following `docs/gpu/PARITY_CHECKLIST.md` §2a (enforcement-only change):** the negative suite (H5) and the
  source-tamper suite (P5) are rerun on a commit whose pinned files equal the accepted ones; `tools/gpu-phase3/accept.ts`
  now requires these reruns (`results/policy/negative-acceptance.json`, `tamper-acceptance.json`: pass, the final binary,
  and `git diff --quiet <their commit> HEAD -- <every pinned file>`) **in addition to** the final campaign's runs. The
  policy, enforcement, host-pipeline and layout tests run inside `accept` on the accepted tree, as before.
  `npm test` and the root type check are rerun on the same commit (`chains/acceptance-reruns.sh`; results in
  `results/tests/*-acceptance-tree.txt`).
- **Not rerun:** the GPU parity campaign, replays, sanitizer and sustained run (the evaluation digest and the binary are
  unchanged) and the Strategy Lab suites (no file of `apps/` or its dependencies changed).

## A2 — 2026-11-19T21:21Z: a root type-check finding kept as a disclosed limitation

The same check found a type-only error in `src/gpu-backend/hostPipeline.ts:196` (`Transferable`, a DOM type name absent
from Node's typings). The root type check is not one of §9's gates; the file is in the binary's evaluation digest, so a
fix means a new binary and a new full campaign. It is left unchanged, disclosed in the reports and queued for the next
acceptance cycle. Runtime behaviour is unaffected: every test and campaign ran this code.
