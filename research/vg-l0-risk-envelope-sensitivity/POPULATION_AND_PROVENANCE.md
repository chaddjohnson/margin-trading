# POPULATION_AND_PROVENANCE — RES-A 1.0.0

What population the audit analysed, where every record came from, how it was de-duplicated, what was missing, and
which archives were copied (with hashes). The headline: **the complete original CTRL and EXP search populations of both
cutoffs, with every risk metric, were recoverable from the pilot's own archives with zero evaluations**; Assignment 3's
compressed archives were not needed.

## 1. Sources

| Source | Path | Use | sha256 |
|---|---|---|---|
| C21 search archive (both arms, one job, two phases) | `research/vg-l0-risk-envelope-pilot/cache/jobs/C21-search/archive.sqlite` (git-ignored) | every centre and neighbour record of both arms' 8 lanes, with the envelope | `cdda0ed9ab199b104abe6af693dc30170241b045eeb3b168a60a729737ff227b` (609,193,984 B) |
| C24 search archive | `…/cache/jobs/C24-search/archive.sqlite` | the same at C24 | `d0b270f4cbe86269e94d96294a8676822ba96cccb5ddac83bd0333f125f701f8` (527,859,712 B) |
| C21 qualification archive | `…/cache/jobs/C21-qualify/archive.sqlite` | every qualification evaluation (26 members × 653) | `f94760421cc1ef81ff49cb96021e9b98885b8d396adef411ec25d85da75aa92e` (75,014,144 B) |
| C24 qualification archive | `…/cache/jobs/C24-qualify/archive.sqlite` | the same at C24 | `78c3809ebe2e775683c5a5de5c56b73858c220d5b6c6a099db75ef36ed67647a` (75,075,584 B) |
| Sealed pilot records | `research/vg-l0-risk-envelope-pilot/results/` (`seals.jsonl` sha256 `5235c4891bd2251e…`) | lane results (reproduction target), qualification evidence, selections, next-interval records, census, diagnostics | per file in the pilot's `seals.jsonl` |

- **Location note (AMENDMENTS N1):** the brief names `.cache/vg-l0-risk-envelope-pilot/`; the pilot's caches are in
  `research/vg-l0-risk-envelope-pilot/cache/` (git-ignored). The ZIP handoff's 222 (C21) / 196 (C24) "diagnostic centres"
  are only the pilot's CPU-diagnosed subset; this audit analyses the whole population (§3).
- **Copies, not originals.** Each archive was copied to `.cache/vg-l0-risk-envelope-sensitivity/jobs/<job>/archive.sqlite`
  at 2026-11-22T16:02Z; sha256 of the original **before** the copy = **after** the copy = the copy (all four);
  `PRAGMA integrity_check` = `ok` on each copy over a read-only connection. The originals were never opened (not even
  read-only); the replays opened the copies, with the exact binding of the official job (study, job, door, door pin,
  backend `gpu:GPU-ae5f222c…:cb2ff30b9cb720c0:d1a2e490788fa5fa`, frozen code digest `b61f771d…`) — a different binding is refused by the store.
- **Assignment 3's `.sqlite.zst` archives** (`.cache/vg-l0-full-joint/jobs/*`): not restored, not opened. Every CTRL
  request of both cutoffs was an archive hit in the pilot's own archive (the CTRL lanes are Assignment 3's lanes, re-run
  in full by the pilot with the envelope requested; E2: identical). No restoration instruction applied.

## 2. Replay coverage (zero evaluations)

| Item | C21 | C24 |
|---|---:|---:|
| Archive rows (unique evaluation keys `…|risk`; = CTRL fresh + EXP fresh in the pilot) | 132,290 (= 70,756 + 61,534) | 113,533 (= 61,955 + 51,578) |
| Requests replayed: CTRL / EXP (= the sealed requested counts) | 71,314 / 66,228 | 62,488 / 54,502 |
| of which centre requests (both arms, with repeats) | 14,198 | 16,638 |
| of which neighbour requests (both arms, with repeats) | 123,344 | 100,352 |
| Fresh evaluations in the replay | **0** | **0** |
| Neighbour draws read back for the measured rung neighbourhoods | 121,168 | 99,968 |
| Qualification evaluations replayed (26 members) / fresh | 16,978 / 0 | 16,978 / 0 |

## 3. The candidate population (categories kept apart)

| Category | C21 | C24 | Note |
|---|---:|---:|---|
| **Unique centres** (canonical `cfgId`; inactive genes canonicalized) | 11,462 | 13,899 | every configuration either arm proposed as a centre |
| requested by CTRL / by EXP / by both | 6,890 / 6,620 / 2,048 | 8,255 / 7,694 / 2,050 | "both" is essentially the identical screen (2,048 proposals) |
| unique funded-lot ledgers among them | 9,714 | 12,318 | behaviourally identical centres share a ledger; reported, not merged |
| excluded: net ≤ 0 / a family unfunded / error / no envelope | 454 / 1,364 / 0 / 0 | 852 / 1,804 / 0 / 0 | no record lacks a valid envelope |
| **Scope: profitable, funded, complete risk record** | **9,644** (7,912 ledgers) | **11,243** (9,705 ledgers) | the centre-level analysis set |
| scope by highest stage: screen only / rung 1 / refinement move / rung 2 / rung 3 or endpoint / shortlist | 828 / 6,730 / 1,974 / 48 / 40 / 24 | 940 / 8,091 / 2,100 / 48 / 40 / 24 | rung 1 = promoted screen centres, island children and fillers |
| Measured rung neighbourhoods (unique centre × rung): r1 (16 draws) / refinement (16) / r2 (64) / r3 (128) | 5,546 / 1,131 / 96 / 64 | 4,170 / 1,182 / 96 / 64 | r1 and refinement moves are centre-first: neighbours only where the fitting arm found the centre plausible |
| Neighbour perturbations | — | — | never candidates; only their statistics enter |
| Rung-3 fits and refinement endpoints (union of both arms) | 64 | 64 | the pool the shortlists were drawn from |
| Shortlist members (union; the **common population**) | 24 (CTRL 12, EXP 12, no overlap) | 24 (12, 12) | qualified with Assignment 3's instrument by the pilot |
| Qualification members (shortlists + New L0 + N/original benchmarks) | 26 | 26 | benchmarks are descriptive, never selectable |
| G1 gap-filled configurations (rung-3 / endpoint, not shortlisted) | 40 | 40 | CPU confirmation 3 × 128 + 10 bps; never selectable |

Provenance of every centre (arm, lane = seed key `C2x/broad/<cell>/R<r>`, stage of each request, every sealed lane tag)
is in `results/centres-C2x.csv.gz` (one row per scope centre: `origin`, `lanes`, `highestStage`) and in the git-ignored
intermediate `.cache/vg-l0-risk-envelope-sensitivity/population-C2x.json.gz` (`sources`, `stageTags`, the configuration).
Unique centres by arm and request stage (a centre counted once per arm and stage):

| Arm · stage | C21 | C24 |
|---|---:|---:|
| CTRL screen / EXP screen (identical proposals) | 2,048 / 2,048 | 2,048 / 2,048 |
| CTRL / EXP rung 1, promoted screen | 256 / 256 | 256 / 256 |
| CTRL / EXP rung 1, island children and fillers | 3,840 / 3,584 | 5,120 / 4,608 |
| CTRL / EXP refinement moves | 1,002 / 988 | 1,088 / 1,038 |
| CTRL / EXP rung 2 | 48 / 48 | 48 / 48 |
| CTRL / EXP rung 3 + refinement endpoints | 32 / 32 | 32 / 32 |
| CTRL / EXP shortlist | 12 / 12 | 12 / 12 |

## 4. Missing data and the audit's limits

- **Centre metrics: none missing.** Every unique centre of either arm has its record and a valid envelope (marked and
  liquidation PL and BD).
- **Rung-1 / refinement-move neighbourhoods are centre-first.** A centre that neither arm found plausible has no
  measured 16-draw neighbourhood. The relaxed policies admit some such centres (for example DD in ($35k, $40k] with BD in
  ($25k, $30k]); their stage feasibility is **unmeasured** and counted per policy (`results/TABLES.md` §9), never filled
  or extrapolated (the brief does not authorize a search-fidelity replay).
- **Confirmation (3 × 128) exists only for the 26 qualification members**; G1 adds it for the 40 non-shortlisted rung-3
  fits / endpoints per cutoff. Lower-stage centres have no confirmation evidence; the audit makes no qualification claim
  about them.
- **No selection family (2 × 128) for the G1 set**: RA1 is not computed for it; G1 is an extended *descriptive* set.
- **Giveback attribution (D3) needs a portfolio path**, which the archives do not store; G2 replays it on the CPU for
  every centre whose verdict changes across the policies (§5).
- **Next intervals:** only the pilot's sealed subjects (its distinct primaries and the benchmarks) have interval
  records; a counterfactual selection that is not one of them is reported as `not evaluated` (none occurred).
- **What an archive cannot tell:** which regions a search run under P1, P3 or P4 would have explored. Every count here is
  an eligibility change on vectors that the CTRL or EXP search happened to propose.

## 5. Bounded CPU replays (PROTOCOL.md §5)

| Replay | Configurations | Requested CPU evaluations | Runtime | Parity (CPU = archived GPU, bit for bit) | Output (sha256) |
|---|---:|---:|---:|---|---|
| G3 C21 | 2 primaries × 128 draws | 256 | 32 s | 256 / 256 | `results/replays/G3-C21.json` |
| G3 C24 | 2 × 128 | 256 | 39 s | 256 / 256 | `results/replays/G3-C24.json` |
| G1 C21 | 40 | 15,440 | 546 s | 40 / 40 centres | `results/replays/G1-C21.json.gz` |
| G1 C24 | 40 | 15,440 | 613 s | 40 / 40 centres | `results/replays/G1-C24.json.gz` |
| G2 C21 | 1,534 centres | 3,068 (2 engine passes each) | 92 s | 1,534 / 1,534 records | `results/replays/G2-C21.json.gz` |
| G2 C24 | 1,704 centres | 3,408 | 105 s | 1,704 / 1,704 records | `results/replays/G2-C24.json.gz` |

All within the predeclared caps (G1 ≤ 80 configurations per cutoff, ≤ 70,000 evaluations in total; G2 ≤ 8,000 centres per
cutoff). Doors opened: D21 and D24 only (`results/doors.jsonl`); D23 and FULL never.

## 6. Hashes of the audit's own intermediates (git-ignored, reproducible)

| File | sha256 |
|---|---|
| `.cache/vg-l0-risk-envelope-sensitivity/population-C21.json.gz` | `230ee6c74b5672809f4cb13535cba8dbc7b7afad0b448b427fcae430ba6d6d65` |
| `.cache/vg-l0-risk-envelope-sensitivity/population-C24.json.gz` | `71078c00c5f6c65f1375effeb30323ff8f9107e44e73c3a25a23aafa8246adba` |
| `.cache/vg-l0-risk-envelope-sensitivity/qualification-C21.json.gz` | `8006788f4046120f503f5f4afea70c2ae0f1c2503e8466791ad9fc167352d1d6` |
| `.cache/vg-l0-risk-envelope-sensitivity/qualification-C24.json.gz` | `038613a01faf711608592971367b4c95ced2d5517d05f966c4ed560299a53cfa` |

The committed results (`results/`) are listed with their sha256 in `results/MANIFEST.sha256`.
