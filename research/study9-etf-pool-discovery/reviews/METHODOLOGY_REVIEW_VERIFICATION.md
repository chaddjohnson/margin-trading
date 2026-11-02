# Verification of the methodology-review resolutions: Study 9, Phase A (pre-freeze)

**Reviewer:** the same independent read-only agent as `reviews/METHODOLOGY_REVIEW.md`, 2026-11-02, about 18:54Z. No files were written and no code was run. Of the results, only `results/pilot/pilot.json` and the `results/s0` headers were read.

**What was read:** the current `src/study9-etf-pool-discovery/*.ts` (including the 13 unit tests), `scripts/build_tables.py`, `PROTOCOL.md` (801 lines; §3, §4.3, §6.3–6.4, §7, §8, §9, §10 and the §13 table), `AMENDMENTS.md` A0, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`, and the disclosures in `DATA_AND_UNIVERSE_AUDIT.md`. The Study 8 code relied on by the new Q2b, Q8 and E1 checks was cross-checked.

**Verdict:**
- All findings are resolved except C1, which is only partly resolved: a kept redundant proxy that shares the anchor's group is still blocked from every primary stream (new issue N1, major).
- Eight minor new issues were found (N2–N9).
- No new path to post-2024 data was found.
- The nomination, slot-3, Batch B replacement and null-reference code was never exercised by the smoke runs (0 nominations). It was checked by reading: apart from N1, N3 and N8, no logic or crash errors were found.

## Resolution table

| Finding | Status | Evidence (current file:line) |
|---|---|---|
| C1 chained groups; proxies excluded on correlation alone | **Partially resolved** | Complete-linkage groups (≤ 3 members, one cluster, refused merges recorded, components reported only): `s2.ts:342–401`. Direct proxies only: `s2.ts:403`. Redundant proxy kept on replay gain: `s2.ts:576–586`. **But** a kept proxy in the anchor's group fails `dupOk` in every primary stream (N1). |
| M1 depth-first beam/swaps | Resolved | `roundRobin` `s3.ts:439–465`. Child order per parent (best primary child, then best exploratory child): `s3.ts:566–579`. Swaps round-robin over 6 pools: `s3.ts:581–599`. Skip counts: `s3.ts:512–516`. Count semantics: see N5. |
| M2 no incremental-improvement criterion | Resolved | I1 (subset measured on the same decisive points, restricted) and I2: `s3.ts:845–875`. Gate in nomination: `s3.ts:1140`, `1165`. Track sets as controls: `s3.ts:1150–1163`. Negative families: `s3.ts:1415`. Batch B ≥ 2 pools different: `s3.ts:1339–1369`. 48 null pools: `s3.ts:605–629`. Null standing on the independent 64: `s3.ts:1292–1308`. |
| M3 family contamination | Resolved | Forbidden sets per family: `s2.ts:412–418`. N seeds exclude the anchors' clusters: `s2.ts:420`, `432–439`. `allowedOf` applied in every stream, null included: `s3.ts:366–402`, `504–510`, `613`. Proxy labels: `s3.ts:117`, `143–161`. |
| M4 decisive offsets shared across pools | Resolved | Joint LHS per pool, Study 8's `coordinate` and unit layout: `design.ts:140–169`. Used for the decisive set, the replicates and the in-box set: `s3.ts:831–836`, `880`. Identical to Study 8's instrument except the seed namespace. |
| M5 standalone-selected assignments only | Resolved | δ1, δ2, ε: `s2.ts:115–129`. Nine keys: `s2.ts:35–45`. Slot 3 chosen by cluster count, then share: `s3.ts:1167–1176`. |
| M6 dependent time diagnostics | Resolved | TD3 in S1 (`s1.ts:234–252`) and S3 (`s3.ts:1223–1238`, `1281–1282`). Fold, year and ex-2020 stores: `design.ts:259–279`. TD3 at the best assignment is not walk-forward clean (N6). |
| M7 PBO on another statistic | Resolved | Neighbourhood half-year robust blocks over unique configurations, centre PBO labelled, lower-bound note: `s3.ts:1239–1266`. |
| M8 contention metrics only at high precision | Resolved | `leaveOneOut` for every proposal's best configuration: `s3.ts:262–303`, `356`. |
| M9 chain and pin gaps | Resolved | `seal` limited to `report-*` and after nomination: `commands.ts:182–195`. `parity.json` passed and sealed: `commands.ts:38–47`, checked directly in `s1` and `seal-s1` and transitively for later stages. Pre-freeze amendment IDs refused: `records.ts:354–357`. Scripts and `package.json` pinned: `records.ts:185–191`. Budgets, families and rules in the rulebook: `records.ts:196–206`. |
| M10 parity power | Resolved | Tie-heavy pools at one shallow vector, requiring > 0 same-minute decisions and > 0 refusals: `parity.ts:173–231`. N2 at base, next-open and +25 bps, with a required open lot at the cut: `parity.ts:397–448`. |
| m1 S1 order | Resolved | One constrained order at final precision: `s1.ts:176–181`. Introduces N2. |
| m2 mid order on pooled 80 | Resolved | Mid ordered on the independent 64: `s3.ts:730–741`. Shrinkage from the 64: `build_tables.py:396–412`. |
| m3 duplicate assignments | Resolved | `s3.ts:323–357`, `716–719`, `1240–1250`. |
| m4 near-identical batch rule | Resolved | Symmetric difference ≤ 2: `s3.ts:1110`, `1115`, `1318–1320`, `1353–1357`. |
| m5 centre re-measurement | Resolved | Q2b matches Study 8's `nearBound` and in-box rule: `s3.ts:810–888`. Q8: `s3.ts:935–938`; differs from Study 8 when centre net ≤ 0 (N4). |
| m6 ranking label | Resolved | PROTOCOL §6.3; four objectives and non-dominance: `s3.ts:929`, `1118–1123`, `1149`. Stale comments: see N7. |
| m7 window extension | Resolved | PROTOCOL §7.4; `s3.ts:910–912`. |
| m8 annualization | Resolved | `s3.ts:201–202`, `1267–1280`; `s1.ts:102–103`. |
| m9 multiplicity accounting | Resolved | Per-stratum compute: `s3.ts:487`, `648–652`. Per-family trials: `s3.ts:1404–1413`. The N seed layer is disclosed in text only, with no numeric field. |
| m10 smoke disclosure | Resolved | AMENDMENTS A0 §3: runs, printed counts, door openings, outcome-derived information. |
| m11 S0 post-2024 reads | Resolved | `DATA_AND_UNIVERSE_AUDIT.md:12–14`, `90`. |
| m12 ungated pre-freeze commands | Resolved | `main.ts:20–27`. |
| m13 E1 pin check | Resolved | Per-symbol `integrity.data["data/<SYM>/data.csv"]` (path matches Study 8 `integrity.ts:19–25`, `80–85`); all 64 prior-vintage prefixes: `parity.ts:535–569`. §14.4 reworded. |
| m14 protected list could pick VGT/GDX | Resolved | `s2.ts:522–535`. |
| m15 conventions and stale text | Resolved | `verifyDoorLog` (`records.ts:130–153`), run in `verify-chain` only (N8). `door.ts:4` corrected; nonexistent `report` command removed from `main.ts`. |
| m16 partial items | Resolved | Per-book episodes: `s3.ts:275`. Skipped children: `s3.ts:559–564`. Config divergence by hash and diffstat: `DATA_AND_UNIVERSE_AUDIT.md:158`. |
| m17 point-estimate bands | Resolved | `s3.ts:753`, `932`. |
| m18 stale checkpoint and docs | Resolved | `RESEARCH_RECOVERY.md` refreshed at 18:48Z; `README.md` and `RUN_COMMANDS.md` exist. The PROTOCOL header still says "11 tests" (N7). |
| m19 ambiguous exploratory picks | Resolved | Additional picks: `s3.ts:1001–1005`, `1015–1018`. |

## New issues

### Major

**N1: A kept redundant proxy that shares the anchor's group can never enter a primary pool, so the C1 resolution is ineffective there.**
- **Where:** `s2.ts:576–616`, `s3.ts:139–140`, `537`, `561`; PROTOCOL §7.5 versus §7.6.
- **What:**
  - Complete linkage will usually put an anchor and its strongest direct proxy (e.g. VGT–XLK, same cluster) in one group.
  - S2 keeps that proxy when its replay adds net, and can place it in the V or VG primary list. `usedGroups` starts empty for V, G and VG, so the anchor's group is not marked as taken.
  - S3's `dupOk` counts groups over *all* members, anchors included. Every exhaustive-candidate, beam and swap pool containing the proxy is therefore rejected.
- **Why it matters:** the proxy takes one of the 9 primary slots but appears only in random exploratory pools. The rule "stays a candidate on replay evidence" (§7.6) is silently void, and §7.5 ("one member per group") contradicts §7.6 for anchor group-mates.
- **Fix (decide before the freeze):** either
  - (a) exempt the anchor's own group in `dupOk` for kept redundant proxies, counting groups over the non-anchor members plus the anchor, but allowing a kept proxy of that anchor; or
  - (b) seed `usedGroups` with the anchors' groups in S2, so such proxies never take a primary slot, and state in §7.6 that kept proxies live only in the exploratory streams.

  Add a unit test with a synthetic `groupOf`.

### Minor

**N2: S1's single mixed-precision order favours unverified vectors.** (`s1.ts:164–181`)
- The 8 re-measured vectors shrink toward the mean at 80 points; vectors 9–64 keep their unshrunk 16-point values. A 16-point-only vector can therefore overtake them.
- α, β, the menu and the ETF order (`s2.ts:425–430`, `vectors[0]`) may then rest on 16-point values.
- *Fix:* after re-measurement, re-measure (64 points) any 16-point-only vector that now ranks within each half's top 2 or at position 1, and repeat up to a fixed cap (e.g. 16 re-measured vectors). Alternatively, rank 16-point-only vectors after re-measured ones of equal feasibility.

**N3: The nomination code paths are untested.** Smoke run 4 produced 0 nominations, so slots 1–3, `nonDominated`, the queue reasons, Batch B replacement, `nullStanding`, the I1 restriction on real points and complete-linkage merges never ran.
- By reading, no further errors were found:
  - `nonDominated` compares a spread copy with its original safely;
  - Batch B replacement keeps the caps;
  - `midBy` overrides only track-set ids, which are never nominated.
- *Fix:* extract the selection and batch logic of `runNominate` into a pure function and unit-test it on synthetic `High` and `Mid` records (≥ 1 qualified pool, an exploratory slot-3 case, B = A forcing replacement, an empty stratum). Test the grouping (complete versus chained, size cap, cross-cluster) and `restrict` the same way.

**N4: Q8 passes when centre net ≤ 0.** (`s3.ts:937`) Study 8's Q8 requires the train centre to be > 0 (`study8/evidence.ts:305–308`). *Fix:* `pass: centre.net > 0 && median·y ≥ 0.6·centre.net`.

**N5: Skip counts are computed eagerly over every potential child, not over those actually reached.** (`s3.ts:559–577`, `587–597`, `451`)
- `admissible()` runs for every child of all 12 parents and every swap of all 6 pools, including ones never reached within the budget.
- Duplicates between parents are dropped silently in `roundRobin` and never counted as "already proposed".
- *Fix:* count inside `roundRobin` as items are consumed, or rename the field to "rejected candidate children (all parents)".

**N6: TD3 at the best assignment uses later information.** (`s3.ts:1255`, `1281`) The best assignment is chosen on the full 2017–2024 period, and beam and swap proposals were generated adaptively, so this variant is not walk-forward clean. *Fix:* label the α variant as the clean TD3 in §4.3 and the reports.

**N7: Stale text.**
- PROTOCOL header item 4 says "11 tests"; there are 13.
- §11.1 says the table builder is "outside the pinned code", contradicting §3 and `records.ts:185–191`.
- §3 says "every stage after parity requires `parity.json` passed": true only transitively; the direct check is in `s1` and `seal-s1`.
- Stale code comments: `s2.ts:3–16` (connected components; α, β, γ only), `s1.ts:3–5` and `39–40` ("Study 8's constrained order").
- `build_tables.py` annualizes ex-2020 with a hard-coded 6.524 years. Compute it from sessions instead.

**N8: The door-log and loader-caller check runs only in `verify-chain`.** (`records.ts:130–153`, `commands.ts:71–79`) *Fix:* call `verifyDoorLog()` inside `requireIntegrity` so every stage fails closed.

**N9: The null-reference percentile mixes precisions.** (`s3.ts:1294–1305`)
- It compares a nominee's independent 64-point robust with the null pools' selected best-of-9 16-point values. That is conservative for the nominee, but the two are not like-for-like.
- Null pools also run `leaveOneOut` and then discard the result (wasted replays).
- *Fix:* state the conservatism in the reports, optionally measure each null pool's best configuration at 64 points, and skip the leave-one-out for null pools.

## Notes (checked and found sound)

**No new data access:** the new code adds only byte-prefix hashing (E1), door-log parsing and JSON reads. Door, engine and cache keys are unchanged.

**I1 compares like with like:** the leave-one-out subset is measured on the pool's own unique decisive points, restricted to the subset and deduplicated against the subset centre. This is paired and correct.

**Fixes that match Study 8:**
- The decisive set is Study 8's instrument: `latinOffsets` over k×8 dimensions, the same `coordinate` and the same unit layout `unit[b·8 + d]`, in engine book order.
- Configurations with the same member set (a proposal, its reference and the incumbents) share offsets, as Study 8's tracks did.
- Q2b's near-bound rule and in-box design equal Study 8's.

**Fail-closed risks to accept knowingly:**
- P1 now requires > 0 same-minute decisions and refusals across the tie pools. GLD/IAU and VGT/XLK at one vector make this very likely, but a zero would stop the study without any correctness failure.
- E1 depends on Study 8's freeze record holding the per-file pins under `integrity.data` (consistent with `study8-runners/data.ts:28–33`).
