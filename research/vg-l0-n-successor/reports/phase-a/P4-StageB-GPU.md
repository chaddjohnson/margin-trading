# Phase A evidence: Priority 4 (S1) and Stage B, the GPU broad-search lane

Read-only reconstruction from executed records, written 2026-11-24T11:49Z (UTC). No evaluation was run, no market
data under `data/` was opened, no `archive.sqlite` was opened (only its size was read), and no existing file was changed.
All times are UTC. Factual only: this report makes no recommendations.

## 0. Sources, conventions and record identities

**Path prefixes**

| Prefix | Meaning |
|---|---|
| `P4B:` | Priority 4 records committed only on branch `research/vg-l0-staged-trailing-stop` (tip `4a89d02a8d3e3885c82e722a3c09115b9cca3502`), read with `git show <branch>:research/vg-l0-staged-stop/<path>` |
| `P4D:` | the git-ignored on-disk copy `research/vg-l0-staged-stop/<path>` in this checkout: stage logs `results/logs/*`, the job caches `cache/jobs/*` (sizes only) |
| `P4src:` | `git show research/vg-l0-staged-trailing-stop:src/vg-l0-staged-stop/<file>` |
| `SB:` | `research/vg-l0-risk-envelope-stage-b/<path>` on this branch (`research/vg-l0-n-original-successor`, HEAD `5d587bb2`); logs under `SB:results/logs/` are git-ignored |
| `LANE:` | `src/vg-l0-risk-envelope-pilot/search.ts` (Stage B's lane; P4's `search.ts` is generated from it with declared substitutions) |

**Marks.** **[V]** = read from, or computed only from, the named record and field. **[R]** = taken from a report or
narrative document, or a stated inference. Tables carry their sources in a "Sources" line, column by column.

**Terms**

- **Requested** evaluations include archive hits. **Fresh** evaluations are the ones that ran on the GPU. The small
  remainder, requested − fresh − hits, is in-flight de-duplication [R] (`SB:REPORT.md` §3 footnote 1). For example,
  P4 C19 search: 2,456,999 − 2,429,995 − 25,753 = 1,251.
- **Budget-bound** means the lane's stop reason is "extension cap reached (a trigger still fired: budget-bound, not
  converged)". The lane ran `islandsMax` islands and its last trigger still fired. The other stop reason is "triggers
  not met". [V] `runLanes` in `src/vg-l0-risk-envelope-stage-b/stages.ts` lines 340–369, with the field
  `lanes.<arm>[].extension.stop`.
- **Trigger.** It is measured after each island from island index 1 onwards. It fires if any one of these holds:
  - hypervolume gain > 5 %;
  - best robust gain > 5 %;
  - best centre-net gain > 5 %;
  - at least one new feasible behaviour class.

  Here a class is `cell | control pattern | funded components`. In EXP the control pattern also carries the staged
  pattern (`st:…`), one of 8. [V] `LANE:` lines 1028–1046; `P4src:space.ts` lines 566–567. Below, the components are
  abbreviated **HV, ROB, NET, CLS**, parsed from `triggerLog[].reason`.
- **Island index** i is the (i+1)-th island. The base schedule runs islands 0 and 1, then extends by one island per
  round up to `islandsMax`: 6 in the base search, 9 in the P4 extension block, 8 for the informed lanes.
- **An island's own stop is always "budget"** in these lanes. Each island ends after its 256 new configurations
  (8 generations × population 32), so patience-8 stagnation never ends a broad island first. This is distinct from a
  budget-bound lane. [V] `lanes.*[].islands[].stop`: every broad island reads "budget" in every P4 search and extend
  record and in every Stage B search and repro record (794 + 49 islands). Only informed lanes show "stagnation".
- **Cells.** GA0.VA0 has one control pattern (`-`). In CTRL, GB0.VD1 has 16: `VGTK1–4 × GDXe/n × VGTe/n`. [V] the
  `lanes.CTRL[].byClass` keys of `P4B:results/search/C*.json`. EXP multiplies each by the 8 staged patterns, giving 8
  and 128 [R] (`P4src:space.ts` `controlPatternOf`).

**Record identities.** sha256 values were recomputed now. "Seal" means the hash equals the entry in the study's
`results/seals.jsonl`.

| Record | sha256 | Seal |
|---|---|---|
| `P4B:results/search/C19.json` | `9f2f3387cd15ba2bb8635329efe5f035c90ae46bb3664fda33616724b3ac7da1` | match |
| `P4B:results/search/C21.json` | `735b711242f3f1be2c20439509236db85cd672e6dce24d8215187df31a0dec91` | match |
| `P4B:results/search/C24.json` | `dff693ef319f95fcd10739c9173ab8ce5d78e9aa60eb79c3e4416eeade5e078f` | match |
| `P4B:results/extend/C19.json` | `f302fc3b6dee02f555d443eeec96421ab428d4f6b1dd04cdc89743c3a2ad0c79` | match |
| `P4B:results/extend/C21.json` | `fac36c510d7015974ae6a1866b7fbb75c2c479d5e48846d61c47989398b85a74` | match |
| `P4B:results/extend/C24.json` | `c69d66950af47d45a6fc07f5cf01be86c714ca31d4cad6523675a801ad0ee61e` | match |
| `P4B:results/informed/C24.json` | `8509747548269c5d7c20128153da741e607d0960a68c6195cbbc84802338965a` | match |
| `P4B:results/qualification/C19.json` / `C21` / `C24` | `278e1a7d…62b6` / `2d18e555…bcb7` / `643fd676…cc4f` | match |
| `P4B:results/intervals/C19.json` / `C21` / `C24` (validation) | `4a15ede3…9052` / `70c09d58…0064` / `284dc1d5…8b9b` | match |
| `P4B:results/outcome.json` | `949756c9d4a62418640857c0d1e20389f2d98e1ce35598d9ce91262c65d98845` | match |
| `P4B:PROTOCOL.md` | `bd57ea2a476be9735e3f199749e511d184f247b9c903dd5853e847899de8b6f7` | (= `P4B:reports/REPRODUCIBILITY.md` §1) |
| `P4B:reports/SEARCH_REPORT.md` | `a08e57ba1fd4bfd7e2f7a23331bec2a09ae3eabd9f701deecaba1fd7f7552229` | — |
| `P4B:reports/tables/search-budget.md` / `search-compute.md` / `extension.md` | `7db5d9e1…1c21` / `e1e7659a…eebb` / `c9b22141…a675` | — |
| `P4B:reports/diagnostics/job-archives.sizes.txt` / `job-archives.sha256` | `d33bf32c…3cf6` / `6e1c0199…c7f1` | — |
| `P4B:results/jobs/C19-search/receipts.jsonl` / `telemetry.jsonl` | `7884fb1e…a7bc` / `de409065…7bb7` | — |
| `P4B:results/jobs/{C21-search,C24-search}/receipts.jsonl` | `eb0829ed…591d`, `3489cb07…ca5d` | — |
| `P4B:results/jobs/{C19,C21,C24}-extend/receipts.jsonl` | `23c6aefc…a2c8`, `aeb18a08…b12f`, `4e51c84a…04e8` | — |
| `P4B:results/jobs/C24-informed/receipts.jsonl` | `135ef15e…3f92` | — |
| `P4D:results/logs/fold-C19.txt` / `fold-C21.txt` / `fold-C24.txt` (git-ignored) | `a6bc399d…5d91` / `2f909151…2007` / `b9ed7114…e885` | — |
| `SB:results/search/C19.json` / `C21` / `C24` | `c716e539…a8c1` / `e07b3e33…aeff0` / `6651ab56…4e3a` | match |
| `SB:results/repro/C19.json` / `C21` / `C24` | `de461ba3…8f1c` / `a84ef84d…b55f` / `db49385f…4213` | match |
| `SB:results/qualification/C19.json` / `C21` / `C24` | `ac27f4fc…4858` / `a78de0c8…9e78` / `147880db…9149` | match |
| `SB:results/intervals/C19.json` / `C21` / `C24` | `4b3882de…8523` / `8e168efa…093f7b` / `2a50805f…748d` | match |
| `SB:PROTOCOL.md` / `SB:REPORT.md` | `603f2515…c603a` / `a4f45c89…ec95` | — |
| `SB:results/logs/fold-C19.log` / `fold-C21.log` / `fold-C24.log` (git-ignored) | `6ac55ec3…8b8b` / `180e9568…78cf3` / `e4cddb19…3f77` | — |

## 1. Priority 4: the paired search (CTRL = S1 OFF, 92 genes; EXP = S1 allowed, 101 genes)

### 1.1 Design facts

All of the following are [V] from the `budget`, `laneCaps`, `cap` and `arms` fields of `P4B:results/search/C*.json`
and `P4B:results/extend/C*.json`.

- **Lanes per cutoff.** 2 cells (GA0.VA0, GB0.VD1) × 32 replicates (R3–R34) × 2 arms = 128 lanes, in one job per
  cutoff.
- **Policy and moves.** Both arms use `nl0-control@1.0.0`. The move bound (`maxMoves`) is CTRL 230 and EXP 257.
- **Schedule.**
  - screen 512 → promote 64;
  - rung 1 with 16 draws;
  - 2 base islands × 256 new configurations, population 32, `islandsMax` 6;
  - trigger threshold 5 %;
  - rung 2 12 × 64 and rung 3 6 × 128;
  - 1 refinement pass;
  - shortlist 3.
- **Lane caps (requested).** Search: CTRL 41,000 and EXP 42,000; job cap 5,312,000. Extension block: CTRL 56,000,
  EXP 57,000, `islandsMax` 9.
- **Extension rule (§6.3).** If more than 25 % of either arm's 64 lanes are budget-bound, every budget-bound lane of
  both arms is re-run once in `<C>-extend` with the island cap 6 → 9. The re-run's result replaces the base result
  [R] (`P4B:PROTOCOL.md` §6.3).
- **Re-run identity.** In 34/34, 38/38 and 49/49 re-run lanes, the per-island `evaluations` and `newConfigs` equal
  the base run for islands 0…(base count − 1) [V]. The comparison is `P4B:results/extend/C*.json lanes.*[].islands[]`
  against `P4B:results/search/C*.json`. Only these counts were compared, not configuration identities.
- **Gate R.** CTRL R3–R18 were identical to Stage B's sealed CTRL lanes in all three folds (32/32) [R]
  (`P4B:reports/SEARCH_REPORT.md` §2–4; `P4D:results/logs/fold-C19.txt` "gate R C19: IDENTICAL (32/32 lanes)" [V]).

### 1.2 Base search (island cap 6), per fold × arm × cell

| Fold | Arm | Cell | Lanes | Requested | Fresh | Hits | Mean req./lane | Islands run (count of lanes) | Stop: triggers not met / ext. cap | Budget-bound |
|---|---|---|---:|---:|---:|---:|---:|---|---|---:|
| C19 | CTRL | GA0.VA0 | 32 | 481,046 | 476,983 | 3,814 | 15,033 | 2:10, 3:12, 4:7, 5:3 | 32 / 0 | 0 |
| C19 | CTRL | GB0.VD1 | 32 | 655,082 | 650,839 | 3,940 | 20,471 | 3:4, 4:12, 5:10, 6:6 | 30 / 2 | 2 |
| C19 | EXP | GA0.VA0 | 32 | 507,547 | 498,531 | 8,690 | 15,861 | 2:7, 3:14, 4:8, 5:2, 6:1 | 32 / 0 | 0 |
| C19 | EXP | GB0.VD1 | 32 | 813,324 | 803,642 | 9,309 | 25,416 | 6:32 | 0 / 32 | 32 |
| C21 | CTRL | GA0.VA0 | 32 | 499,255 | 495,147 | 3,812 | 15,602 | 2:7, 3:12, 4:12, 6:1 | 32 / 0 | 0 |
| C21 | CTRL | GB0.VD1 | 32 | 665,125 | 660,879 | 3,897 | 20,785 | 2:1, 3:6, 4:6, 5:10, 6:9 | 28 / 4 | 4 |
| C21 | EXP | GA0.VA0 | 32 | 617,823 | 609,056 | 8,466 | 19,307 | 2:3, 3:6, 4:7, 5:11, 6:5 | 30 / 2 | 2 |
| C21 | EXP | GB0.VD1 | 32 | 818,237 | 808,378 | 9,459 | 25,570 | 6:32 | 0 / 32 | 32 |
| C24 | CTRL | GA0.VA0 | 32 | 409,859 | 405,569 | 3,929 | 12,808 | 2:6, 3:9, 4:11, 5:2, 6:4 | 32 / 0 | 0 |
| C24 | CTRL | GB0.VD1 | 32 | 512,306 | 508,014 | 3,994 | 16,010 | 3:6, 4:6, 5:6, 6:14 | 24 / 8 | 8 |
| C24 | EXP | GA0.VA0 | 32 | 492,327 | 485,249 | 6,739 | 15,385 | 2:3, 3:5, 4:5, 5:4, 6:15 | 23 / 9 | 9 |
| C24 | EXP | GB0.VD1 | 32 | 614,785 | 607,262 | 7,182 | 19,212 | 6:32 | 0 / 32 | 32 |

Sources [V], all in `P4B:results/search/C*.json`:

- Requested: `lanes.<arm>[].requested`.
- Fresh and hits: the sum of `compute.tallies["<arm> <lane key> <phase>"].fresh` and `.hits` over the lane's phases.
- Islands run: `islands.length`.
- Stops: `extension.stop`.

**Arm totals** [V] (`requestedByArm`):

| Fold | CTRL requested | EXP requested | EXP − CTRL |
|---|---:|---:|---:|
| C19 | 1,136,128 | 1,320,871 | +16.3 % |
| C21 | 1,164,380 | 1,436,060 | +23.3 % |
| C24 | 922,165 | 1,107,112 | +20.1 % |

**Extension rounds inside the base search** [V] (`extensionRounds[].decision`):

| Fold | Lanes extended, rounds 1–4 | Round 5 |
|---|---|---|
| C19 | 111 → 81 → 54 → 39 | "no lane extends" |
| C21 | 117 → 93 → 68 → 47 | "no lane extends" |
| C24 | 119 → 99 → 77 → 65 | "no lane extends" |

No round anywhere recorded "resource guard". The largest lane requested 28,549 (EXP) against the 42,000 cap [V]
(`max(lanes.*[].requested)`).

**Screen breadth (shared by both arms)** [V] (`lanes.*[].counts.plausible`, `failure.screenReasons`): mean
plausible screened configurations per lane, out of 512.

| Fold | CTRL GA0.VA0 | CTRL GB0.VD1 | EXP GA0.VA0 | EXP GB0.VD1 |
|---|---:|---:|---:|---:|
| C19 | 121.1 | 129.4 | 127.5 | 134.6 |
| C21 | 46.3 | 58.9 | 52.6 | 67.0 |
| C24 | 7.4 | 7.8 | 8.8 | 8.9 |

- At C24 the dominant screen rejection is "DD > ceiling": 8,259–9,008 per 32 lanes.
- At C24 promotion by net fills only 237–286 of 2,048 promotion slots per arm·cell. Rank and diversity picks fill the
  rest.

### 1.3 Extension block (island cap 9), per fold × arm × cell

| Fold | Arm | Cell | Lanes re-run | Requested | Fresh | Hits | Mean req./lane | Max lane req. (cap) | Islands run | Stop: triggers not met / ext. cap |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|
| C19 | CTRL | GB0.VD1 | 2 | 56,186 | 55,836 | 335 | 28,093 | 28,439 (56,000) | 7:2 | 2 / 0 |
| C19 | EXP | GB0.VD1 | 32 | 1,126,033 | 1,121,145 | 4,503 | 35,189 | 37,317 (57,000) | 9:32 | 0 / 32 |
| C21 | CTRL | GB0.VD1 | 4 | 120,228 | 119,583 | 613 | 30,057 | 32,083 (56,000) | 7:2, 8:2 | 4 / 0 |
| C21 | EXP | GA0.VA0 | 2 | 60,106 | 59,814 | 284 | 30,053 | — | 7:1, 8:1 | 2 / 0 |
| C21 | EXP | GB0.VD1 | 32 | 1,123,343 | 1,117,900 | 5,084 | 35,104 | 37,410 (57,000) | 8:1, 9:31 | 1 / 31 |
| C24 | CTRL | GB0.VD1 | 8 | 181,405 | 180,230 | 1,090 | 22,676 | 25,954 (56,000) | 7:2, 8:2, 9:4 | 8 / 0 |
| C24 | EXP | GA0.VA0 | 9 | 202,883 | 201,520 | 1,271 | 22,543 | — | 7:3, 8:3, 9:3 | 8 / 1 |
| C24 | EXP | GB0.VD1 | 32 | 835,579 | 829,840 | 5,331 | 26,112 | 30,633 (57,000) | 8:1, 9:31 | 2 / 30 |

- Sources [V]: `P4B:results/extend/C*.json`, the same fields as §1.2. The max-lane column gives the per-arm maximum
  over both cells.
- Job totals: 1,182,219 / 1,303,677 / 1,219,867 requested [V] (`requested`).
- Rounds [V] (`extensionRounds[].decision`):
  - C19: 34 × 6 rounds, then 32, then "no lane extends";
  - C21: 38 × 5, 35, 31, then none;
  - C24: 49 × 5, 44, 38, then none.
- No "resource guard" decision was recorded.

### 1.4 Budget-bound fractions, by arm, fold and cell (the brief's 48.4 %)

| Fold | Arm | GA0.VA0 base → after | GB0.VD1 base → after | Arm base | Arm after the block |
|---|---|---|---|---|---|
| C19 | CTRL | 0/32 → 0/32 | 2/32 → 0/32 | 2/64 (3.1 %) | **0/64 (0 %)** |
| C19 | EXP | 0/32 → 0/32 | 32/32 → **32/32** | 32/64 (50.0 %) | **32/64 (50.0 %)** |
| C21 | CTRL | 0/32 → 0/32 | 4/32 → 0/32 | 4/64 (6.3 %) | **0/64 (0 %)** |
| C21 | EXP | 2/32 → 0/32 | 32/32 → **31/32** | 34/64 (53.1 %) | **31/64 (48.4 %)** |
| C24 | CTRL | 0/32 → 0/32 | 8/32 → 0/32 | 8/64 (12.5 %) | **0/64 (0 %)** |
| C24 | EXP | 9/32 → **1/32** | 32/32 → **30/32** | 41/64 (64.1 %) | **31/64 (48.4 %)** |

Sources [V]: `P4B:results/search/C*.json budgetBound.<arm>` and `P4B:results/extend/C*.json stillBudgetBound.<arm>`,
cross-checked against `lanes.*[].extension.stop`. The brief's "48.4 %" is EXP after the block at C21 and at C24. This
matches `P4B:reports/tables/extension.md` [R].

**Exactly which lanes** [V] (same fields):

| Fold | CTRL base BB | EXP base BB | EXP still BB after the block |
|---|---|---|---|
| C19 | GB0.VD1 R21, R29 | GB0.VD1 R3–R34 (all 32) | GB0.VD1 R3–R34 (all 32) |
| C21 | GB0.VD1 R3, R7, R16, R28 | GA0.VA0 R7, R32; GB0.VD1 R3–R34 | GB0.VD1 all except **R5** (31) |
| C24 | GB0.VD1 R5, R7, R18, R19, R26, R30, R31, R33 | GA0.VA0 R4, R8, R14, R15, R19, R22, R26, R29, R31; GB0.VD1 R3–R34 | GA0.VA0 **R8**; GB0.VD1 all except **R3, R10** (30) |

- **Stage.** The cap was exhausted in the base search (cap 6) and again in the extension block (cap 9).
- **Cell.** After the block, 93 of the 94 EXP budget-bound lanes are GB0.VD1. The other one is C24 GA0.VA0 R8. Every
  EXP GB0.VD1 lane in every fold reached the base cap of 6 islands.
- **Staged patterns.** The EXP representatives of the still-budget-bound lanes span every staged pattern, OFF
  included [V] (`P4B:reports/tables/lanes.md` column "EXP representative pattern", `*` = an OFF projection):

| Fold | Still-BB EXP representatives by pattern |
|---|---|
| C19 | GDX 7, off 6, G 5, GDX+VGT 4, GDX+VGT+G 3, GDX* 2, off* 2, GDX+G 2, VGT+G 1 |
| C21 | GDX+G 5, off* 4, G 4, GDX+VGT+G 4, VGT 3, GDX 3, VGT+G 3, off 2, VGT+G* 1, GDX* 1, G* 1 |
| C24 GB0.VD1 | off 7, GDX+G 4, GDX+VGT+G 4, GDX 3, GDX+VGT 2, VGT+G* 2, VGT 2, off* 2, G 2, GDX+G* 1, GDX* 1 |

### 1.5 Which trigger kept budget-bound lanes open (last trigger at the cap)

| Fold | Stage | Arm · cell (BB lanes) | Components of the last trigger (count of lanes) |
|---|---|---|---|
| C19 | base | CTRL GB0.VD1 (2) | CLS 1; HV+ROB+NET 1 |
| C19 | base | EXP GB0.VD1 (32) | **CLS only 26**; HV+CLS 5; HV+ROB+NET+CLS 1 |
| C21 | base | CTRL GB0.VD1 (4) | CLS 2; HV+ROB 1; ROB+NET 1 |
| C21 | base | EXP GA0.VA0 (2) | CLS 2 |
| C21 | base | EXP GB0.VD1 (32) | **CLS only 28**; HV+CLS 3; NET+CLS 1 |
| C24 | base | CTRL GB0.VD1 (8) | CLS 4; HV+CLS 1; ROB+CLS 1; HV+ROB+NET+CLS 2 |
| C24 | base | EXP GA0.VA0 (9) | CLS 5; HV 1; HV+ROB 1; HV+ROB+NET 1; HV+CLS 1 |
| C24 | base | EXP GB0.VD1 (32) | **CLS only 25**; HV+CLS 2; HV+ROB+CLS 2; HV+ROB+NET+CLS 2; ROB+NET+CLS 1 |
| C19 | extension | EXP GB0.VD1 (32) | **CLS only 30**; NET+CLS 1; HV+CLS 1 |
| C21 | extension | EXP GB0.VD1 (31) | **CLS only 26**; HV+NET+CLS 2; HV+ROB+NET+CLS 1; NET+CLS 1; HV+ROB+CLS 1 |
| C24 | extension | EXP GA0.VA0 (1) | HV+CLS 1 |
| C24 | extension | EXP GB0.VD1 (30) | **CLS only 28**; HV+ROB+CLS 1; NET+CLS 1 |

Source [V]: the last `triggerLog[].reason` of each budget-bound lane, thresholds 5 % and > 0 new classes.

- After the block, the last trigger of all **94/94** still-budget-bound EXP lanes includes CLS.
- For 84/94 lanes the last trigger is CLS alone.

**Extension islands (indices 6–8) of the still-budget-bound EXP GB0.VD1 lanes** [V] (`triggerLog`, `islands[6].before`,
`islands[-1].after`):

| Fold | Lane-island measurements | CLS > 0 | HV > 5 % | ROB > 5 % | NET > 5 % | Mean new classes / island | Δ best centre net, islands 7–9 (mean / median / max) | Δ hypervolume (mean / median) |
|---|---:|---:|---:|---:|---:|---:|---|---|
| C19 | 96 | 96 | 2 | 0 | 2 | 12.6 | +1.33 % / 0.0 % / +11.9 % | +2.69 % / +2.22 % |
| C21 | 93 | 93 | 9 | 3 | 6 | 8.2 | +2.13 % / 0.0 % / +19.8 % | +4.21 % / +2.31 % |
| C24 | 90 | 90 | 10 | 7 | 7 | 7.8 | +2.82 % / 0.0 % / +18.1 % | +6.72 % / +2.15 % |

### 1.6 Per-island progress (which trigger fired; gains in the last rounds)

The table below covers EXP GB0.VD1 in the extension re-run (all 32 lanes per fold). Each cell gives four values:

- the number of lanes whose trigger fired, over the number measured;
- how many of those fired on CLS alone;
- the median gain in hypervolume / robust / centre net, in %;
- the mean number of new classes.

Source [V]: `P4B:results/extend/C*.json lanes.EXP[].triggerLog[]`.

| Island | C19 | C21 | C24 |
|---:|---|---|---|
| 1 | 32/32 · 8 · 10.4/0/0 · 60.0 | 32/32 · 14 · 2.8/0/0 · 42.4 | 32/32 · 7 · 9.6/6.45/0 · 22.7 |
| 2 | 32/32 · 18 · 1.8/0/0 · 39.0 | 32/32 · 20 · 3.0/0/0 · 26.5 | 32/32 · 13 · 5.0/0/0 · 15.5 |
| 3 | 32/32 · 24 · 1.3/0/0 · 31.3 | 32/32 · 22 · 1.15/0/0 · 22.0 | 32/32 · 18 · 2.25/0/0 · 14.3 |
| 4 | 32/32 · 28 · 1.0/0/0 · 23.5 | 32/32 · 25 · 1.2/0/0 · 15.7 | 32/32 · 19 · 1.5/0/0 · 12.7 |
| 5 | 32/32 · 26 · 1.05/0/0 · 19.1 | 32/32 · 28 · 0.35/0/0 · 12.7 | 32/32 · 25 · 0.0/0/0 · 10.3 |
| 6 | 32/32 · 30 · 0.6/0/0 · 15.8 | 32/32 · 27 · 0.0/0/0 · 10.4 | 32/32 · 22 · 0.05/0/0 · 8.3 |
| 7 | 32/32 · 32 · 0.05/0/0 · 11.2 | 31/32 · 30 · 0.05/0/0 · 8.2 | 31/32 · 27 · 0.0/0/0 · 7.9 |
| 8 | 32/32 · 30 · 0.05/0/0 · 10.7 | 31/31 · 26 · 0.2/0/0 · 6.0 | 30/31 · 28 · 0.0/0/0 · 6.7 |

The CTRL contrast below is CTRL GB0.VD1 in the base search, all 32 lanes; same format, without the CLS-only count
[V] (`P4B:results/search/C*.json`):

| Island | C19 | C21 | C24 |
|---:|---|---|---|
| 1 | 32/32 · 5.35/0/0 · 6.5 | 31/32 · 4.8/0/1.05 · 5.7 | 32/32 · 5.3/0/2.0 · 6.4 |
| 2 | 28/32 · 1.55/0/0 · 2.0 | 25/31 · 0.8/0/0 · 1.7 | 26/32 · 3.65/0/0 · 3.7 |
| 3 | 16/28 · 2.85/0/0 · 1.1 | 19/25 · 0.8/0/0 · 1.3 | 20/26 · 1.2/0/0 · 1.8 |
| 4 | 6/16 · 0.5/0/0 · 0.4 | 9/19 · 0.1/0/0 · 0.5 | 14/20 · 0/0/0 · 1.3 |
| 5 | 2/6 · 1.45/0/0 · 0.2 | 4/9 · 0.1/0/0 · 0.4 | 8/14 · 0.25/0/0 · 1.0 |

**Feasible trigger classes at the end of the lane** [V] (`islands[-1].after.classes`); median (min–max):

| Fold | Stage | CTRL GA0.VA0 | CTRL GB0.VD1 | EXP GA0.VA0 | EXP GB0.VD1 |
|---|---|---|---|---|---|
| C19 | base | 3 (3–3) | 47 (44–48) | 24 (24–24) | 282.5 (243–304) |
| C19 | extended lanes | — | 47 (46–48) | — | 316.5 (284–343) |
| C21 | base | 3 (2–3) | 33 (26–39) | 19 (16–23) | 194 (168–225) |
| C21 | extended lanes | — | 35.5 (34–37) | 23 (23–23) | 221 (177–240) |
| C24 | base | 2 (1–3) | 25 (12–37) | 15 (8–23) | 103.5 (72–149) |
| C24 | extended lanes | — | 29.5 (17–35) | 19 (10–23) | 128 (92–162) |

- The observed maxima fit control patterns × 3 funded combinations [R, inference]:
  - CTRL GA0.VA0: 3 = 1 × 3;
  - CTRL GB0.VD1: 48 = 16 × 3;
  - EXP GA0.VA0: 24 = 8 × 3.
- On that basis the class universe of EXP GB0.VD1 would be about 128 × 3 = 384. C19's extended median of 316.5
  would then be about 82 % covered, with new classes still appearing at island 8.

**New feasible `byClass` keys gained by the extension** [V] (`byClass[k].feasible > 0` in the extend record and not in
the base record). These keys use the Growth stratum rather than the funded set, so they are only a proxy for the
trigger class. EXP GB0.VD1, by staged pattern:

| Fold | G | GDX | GDX+G | GDX+VGT | GDX+VGT+G | VGT | VGT+G | off |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 344 | 327 | 332 | 294 | 313 | 378 | 347 | 332 |
| C21 | 296 | 340 | 369 | 365 | 349 | 325 | 294 | 312 |
| C24 | 298 | 221 | 261 | 214 | 294 | 214 | 289 | 213 |

The gain is spread across all 8 staged patterns, OFF included. Staged patterns also receive equal screening: 2,048 of
16,384 screens per cell per pattern [V] (`byClass` `screened` summed by `st:`).

### 1.7 What the extension changed, at search level

The table compares each extended run with its own base run, using the lane state after the last island
(`islands[-1].after`: best feasible rung-1 centre net and robust). This is the search-level state, not the qualified
lane value V. V for the base runs was never computed, because the extension replaced them.

| Fold | Arm · cell | Lanes | Mean extra requested | Mean Δ best centre net | Median Δ | Lanes Δ > $0 | Lanes Δ > 1 % | Max Δ | Mean Δ classes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | CTRL GB0.VD1 | 2 | +3,144 | $0 | $0 | 0 | 0 | $0 | 0 |
| C19 | EXP GB0.VD1 | 32 | +9,772 | +$1,185 | $0 | 11 | 10 | +$10,421 | +37.7 |
| C21 | CTRL GB0.VD1 | 4 | +4,730 | +$1,013 | $0 | 1 | 1 | +$4,052 | +0.8 |
| C21 | EXP GA0.VA0 | 2 | +4,972 | $0 | $0 | 0 | 0 | $0 | +0.5 |
| C21 | EXP GB0.VD1 | 32 | +9,535 | +$4,023 | $0 | 12 | 8 | +$38,869 | +24.4 |
| C24 | CTRL GB0.VD1 | 8 | +5,014 | +$3,902 | $0 | 2 | 2 | +$20,739 | +1.6 |
| C24 | EXP GA0.VA0 | 9 | +4,731 | +$11,117 | $0 | 3 | 3 | +$57,852 | +1.2 |
| C24 | EXP GB0.VD1 | 32 | +6,900 | +$4,482 | $0 | 11 | 10 | +$31,041 | +22.7 |

Sources [V]: `requested`, `islands[-1].after.{net,classes}` of `P4B:results/extend/C*.json` minus the same lane in
`P4B:results/search/C*.json`.

**How the extension block's work split** [V]. Fresh GPU evaluations by window come from the
`P4B:results/jobs/<C>-extend/receipts.jsonl` timestamps and the island barrier times in `P4D:results/logs/<C>-extend.log`.

| Fold | Replay of base work (screen, rung 1, islands 0–5) | New islands 6–8 | Finishing (rungs 2–3, refinement) |
|---|---|---|---|
| C19 | 704,976 (59.9 %), 516 s | 318,510 (27.1 %), 245 s | 153,495 (13.0 %), 77 s |
| C21 | 783,706 (60.4 %), 725 s | 331,722 (25.6 %), 341 s | 181,869 (14.0 %), 109 s |
| C24 | 673,617 (55.6 %), 924 s | 296,193 (24.4 %), 432 s | 241,780 (20.0 %), 167 s |

The re-runs ran in new job archives, so the replayed base work was fresh again: hits were 4,838 / 5,981 / 7,692 [V]
(`compute.archiveHits`).

**Refinement** [V] (`lanes.*[].refinements[].path`). In `LANE:refine`, a path of length 2 means the start found an
improving move (≥ $2,000) in its only pass and stopped at `refinePasses` = 1. A path of length 1 means no improving
move. Counts of starts that moved, by fold, stage and arm·cell:

| Fold | Stage | CTRL GA0.VA0 | CTRL GB0.VD1 | EXP GA0.VA0 | EXP GB0.VD1 |
|---|---|---|---|---|---|
| C19 | base | 37/64 | 32/64 | 42/64 | 33/64 |
| C21 | base | 63/64 | 64/64 | 64/64 | 56/64 |
| C24 | base | 64/64 | 63/64 | 64/64 | 64/64 |
| C19 | extended | — | 2/4 | — | 35/64 |
| C21 | extended | — | 8/8 | 4/4 | 60/64 |
| C24 | extended | — | 16/16 | 18/18 | 63/64 |

- The move-set bound never bound. A lane's `counts.refineMoves` is about 230–313, summed over 2 starts, against a
  bound of 230 or 257 per configuration; no bound error occurred.
- Refinement runs after the island loop, so it does not enter the stop reason.

## 2. Priority 4: informed lanes I1–I4 (C24)

| Type (centre) | Arm | Lanes | Requested | Mean / max per lane | Fresh | Hits | Islands run | Lane stops | Island stops | Seed designs per lane |
|---|---|---:|---:|---|---:|---:|---|---|---|---:|
| I1 (New L0) | EXP | 8 | 242,789 | 30,349 / 30,873 | 183,471 | 59,080 | 4:8 | triggers not met 8 | budget 28, stagnation 4 | 1 |
| I2 (N/original) | EXP | 8 | 237,091 | 29,636 / 30,705 | 184,933 | 51,987 | 4:8 | triggers not met 8 | budget 26, stagnation 6 | 1 |
| I3 (New L0) | CTRL | 8 | 264,807 | 33,101 / 33,190 | 233,829 | 30,929 | 4:8 | triggers not met 8 | budget 31, stagnation 1 | 153 |
| I3 (New L0) | EXP | 8 | 268,355 | 33,544 / 33,669 | 253,224 | 15,074 | 4:8 | triggers not met 8 | budget 32 | 153 |
| I4 (N/original) | CTRL | 8 | 277,378 | 34,672 / 34,711 | 239,866 | 37,486 | 4:8 | triggers not met 8 | budget 32 | 153 |
| I4 (N/original) | EXP | 8 | 297,892 | 37,236 / 41,354 | 276,339 | 21,525 | 4:5, 5:3 | triggers not met 8 | budget 35 | 153 |
| **Total** | | 48 | **1,588,312** | | 1,371,662 | 216,081 | | 0 budget-bound | | |

Sources [V], all in `P4B:results/informed/C24.json`:

- per-lane fields `requested`, `islands[]`, `extension.stop`, `islands[].stop` and `counts.seedDesigns`;
- fresh and hits from `compute.tallies`;
- schedule from `budget`: 4 islands × 384, `islandsMax` 8, refinement plus focus passes 2, shortlist 6;
- `laneCaps` CTRL 90,000 / EXP 93,000.

**Further facts**

- **Extension rounds** [V] (`extensionRounds[].decision`): round 1 "extend 3 lane(s)" (EXP I4), round 2 "no lane
  extends".
- **Last trigger** [V]: "none" in all 48 lanes.
- **Wall and requested** [V]: wall 1,076.5 s (`compute.wallSeconds`). Requested agrees with
  `P4B:reports/SEARCH_REPORT.md` §4.1 [R]: EXP 1,046,127, CTRL 542,185.
- **Refinement** [V] (`refinements[].path` length > 1 = moved):
  - EXP I1 and I2 starts mostly did not move: I1 4 of 40, I2 0 of 40.
  - In I3 and I4 (both arms) every focus-robust start (8/8) and 6–8 of 8 robust starts moved.
  - Focus starts have 2 passes, so a moved focus path is not necessarily pass-capped.

## 3. Stage B (RES-B 1.0.0): CTRL = P0 (`nl0-control@1.0.0`, DD limit $35,000); EXP30 = `sens-p3-40-25-30@1.0.0` (DD limit $40,000)

**Design** [V] (`SB:results/search/C*.json`: `arms`, `budget`, `laneCap`, `cap`):

- 64 lanes per cutoff in one job: 2 cells × 16 replicates (R3–R18) × 2 arms.
- The same broad schedule as P4, `islandsMax` 6.
- Lane cap 41,000; job cap 2,624,000.
- No extension block: there is no `extend` record or job [V] (`SB:results/`, `SB:results/jobs/`). Budget-bound
  lanes were reported, not re-run [R] (`SB:REPORT.md` §3, "Budget-bound lanes").

| Fold | Arm | Cell | Lanes | Requested | Fresh | Hits | Mean req./lane | Islands run | Budget-bound (lanes) |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| C19 | CTRL | GA0.VA0 | 16 | 242,429 | 229,966 | 12,342 | 15,152 | 2:4, 3:7, 4:4, 5:1 | 0 |
| C19 | CTRL | GB0.VD1 | 16 | 329,338 | 314,926 | 14,282 | 20,584 | 3:1, 4:6, 5:7, 6:2 | 0 |
| C19 | EXP30 | GA0.VA0 | 16 | 254,967 | 244,681 | 10,135 | 15,935 | 2:2, 3:8, 4:4, 5:2 | 0 |
| C19 | EXP30 | GB0.VD1 | 16 | 341,406 | 331,031 | 10,164 | 21,338 | 3:1, 4:7, 5:3, 6:5 | 2 (R5, R7) |
| C21 | CTRL | GA0.VA0 | 16 | 253,711 | 243,745 | 9,798 | 15,857 | 2:3, 3:6, 4:7 | 0 |
| C21 | CTRL | GB0.VD1 | 16 | 349,183 | 337,832 | 11,198 | 21,824 | 2:1, 3:1, 4:2, 5:6, 6:6 | 3 (R3, R7, R16) |
| C21 | EXP30 | GA0.VA0 | 16 | 246,691 | 236,576 | 10,010 | 15,418 | 2:5, 3:6, 4:4, 5:1 | 0 |
| C21 | EXP30 | GB0.VD1 | 16 | 334,536 | 324,222 | 10,158 | 20,908 | 3:3, 4:4, 5:6, 6:3 | 2 (R3, R17) |
| C24 | CTRL | GA0.VA0 | 16 | 211,745 | 207,644 | 3,926 | 13,234 | 2:4, 3:2, 4:6, 5:1, 6:3 | 0 |
| C24 | CTRL | GB0.VD1 | 16 | 246,781 | 242,792 | 3,872 | 15,424 | 3:4, 4:3, 5:1, 6:8 | 3 (R5, R7, R18) |
| C24 | EXP30 | GA0.VA0 | 16 | 212,777 | 202,506 | 10,141 | 13,299 | 2:3, 3:5, 4:5, 5:1, 6:2 | 0 |
| C24 | EXP30 | GB0.VD1 | 16 | 306,127 | 295,735 | 10,255 | 19,133 | 4:1, 5:3, 6:12 | 7 (R4, R8, R9, R11, R13, R14, R16) |

Sources [V]: `SB:results/search/C*.json`. Per lane: `requested`, `islands`, `extension.stop`. Fresh and hits come
from `compute.tallies`.

**Budget-bound fractions** [V]:

| Fold | CTRL (P0) | EXP30 |
|---|---|---|
| C19 | 0/32 (0 %) | 2/32 (6.3 %) |
| C21 | 3/32 (9.4 %) | 2/32 (6.3 %) |
| C24 | 3/32 (9.4 %) | 7/32 (21.9 %) |

All of them are GB0.VD1. This agrees with `SB:REPORT.md` §3 [R]. Stage B's CTRL budget-bound lanes (R3/R7/R16 at C21;
R5/R7/R18 at C24) reappear among P4's CTRL base budget-bound lanes, consistent with Gate R [V].

**Last trigger of the Stage B budget-bound lanes** [V]:

| Fold | CTRL | EXP30 |
|---|---|---|
| C19 | — | CLS 2 |
| C21 | HV+ROB 1, CLS 2 | CLS 2 |
| C24 | CLS 1, HV+CLS 1, ROB+CLS 1 | HV+CLS 3, CLS 3, HV 1 |

**Rounds** [V] (`extensionRounds[].decision`): C19 58 → 41 → 20 → 7, C21 55 → 39 → 22 → 9, C24 57 → 46 → 31 → 25,
each followed by "no lane extends". No resource guard. The largest lane requested 26,404 against the 41,000 cap.

**Arm totals** [V] (`requestedByArm`):

| Fold | CTRL | EXP30 |
|---|---:|---:|
| C19 | 571,767 | 596,373 |
| C21 | 602,894 | 581,227 |
| C24 | 458,526 | 518,904 |

**E2 reproduction lanes** (CTRL R1/R2 × 2 cells = 4 lanes per cutoff) [V] (`SB:results/repro/C*.json`):

| Fold | Requested | Budget-bound |
|---|---:|---|
| C19 | 66,697 | 0 |
| C21 | 71,314 | 0 |
| C24 | 62,488 | 2 (one per cell; last triggers ROB and CLS) |

## 4. GPU throughput and resources

### 4.1 Common facts

**Device and binaries**

- Device: RTX 5090 `GPU-ae5f222c…`; 8 host workers in every job [V] (`gpu-attestations/*.json hostPath.workers`;
  `receipts.jsonl` close line `hostWorkers`).
- Stage B used binary gb7 `cb2ff30b9cb7…` (acceptance `bb0e3fcf6bde…`) [V] (`SB:results/gpu-attestations/*search*.json
  binary.sha256`, `acceptance.sha256`).
- P4 used gb8 `86b30753813b…` (acceptance `c02a8a928946…`, Phase 8, on the P4 branch only) [V]
  (`P4B:results/gpu-attestations/C19-search-*.json`).

**Fail-closed counters**

- In every job: 0 failed, 0 CPU-scored and 0 capacity retries [V] (`receipts.jsonl` close line).
- Each attestation passed 16 checks [V] (`checks[]`): purpose, runtime, acceptance, pins, source, job, binary, compat,
  device, no-test-hooks, accepted-device, capability, smoke, memory, host-path, parity (22/22 subjects identical).

**Scheduling.** Every official job of both studies ran alone on the GPU, one after another [V]: the non-overlapping
`begin`/`end` lines in `P4D:results/logs/fold-*.txt` and `SB:results/logs/fold-*.log`, and the `open`/`complete`
events in `results/jobs/*/events.jsonl`. Each job was a `systemd-run --user` unit with MemoryHigh 44G / MemoryMax 48G
[R] (`P4B:reports/REPRODUCIBILITY.md` §1).

**Study totals** [V] (the sum of the stage records' `requested`, `compute.fresh` and `compute.wallSeconds`):

| Study | Requested | Fresh | Job wall | Elapsed | Ceiling |
|---|---:|---:|---|---|---|
| P4 | 14,316,362 | 14,001,785 | 11,400 s | 18:17:25 → 21:30:28 on 2026-11-23 | 25,000,000 [R] (`P4B:PROTOCOL.md` §6.1) |
| Stage B | 3,962,772 | 3,843,161 | 4,183 s | — | bound 8,800,278 [R] (`SB:REPORT.md` §3) |

- The P4 ledger seen by each job [V] (`events.jsonl` "phase" `ledger.used`): C19-search 584, C21-search 4,157,074,
  C24-search 8,609,077.
- P4 extension blocks: 3,705,763 requested (25.9 % of the study) and 3,572.7 s of job wall (31.3 %) [V].

### 4.2 Per-job table: Priority 4

| Job | Door | Lanes in flight | Requested | Fresh | Hits | Wall s | Req./s | Fresh/s | Gate s | Dataset export s | Batches (dominant size) | Σ server ÷ pool wall | Util. samples mean (non-zero) | VRAM peak MiB | Power max / mean W | Memory peak | CPU time | Archive bytes | Bytes / fresh |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|---:|---|---|---|---:|---:|
| ablation | D24 | — | 584 | 584 | 0 | 19.4 | 30 | 30 | 16.2 | 7.9 | 1 (584) | 0.907 | 0.5 % (1/2) | 2,109 | 120.9 / 97.9 | 1.4G | 18 s | 3,575,808 | 6,123 |
| C19-search | D19 | 128 | 2,456,999 | 2,429,995 | 25,753 | 1,118.2 | 2,197 | 2,173 | 9.1 | 5.3 | 334 (8,192 ×253) | 0.665 | 54.5 % (23/37) | 5,911 | 177.7 / 129.9 | 17.4G | 43 min 31 s | 11,364,786,176 | 4,677 |
| C19-extend | D19 | 34 | 1,182,219 | 1,176,981 | 4,838 | 846.6 | 1,396 | 1,390 | 9.1 | 5.3 | 232 (8,192 ×83) | 0.610 | 62.1 % (19/29) | 5,911 | 174.7 / 129.6 | 10.6G | 21 min 26 s | 5,815,566,336 | 4,941 |
| C19-qualify | D19 | — | 469,572 | 469,572 | 0 | 384.2 | 1,222 | 1,222 | 9.1 | 5.2 | 115 (4,096 ×114) | 0.590 | 62.5 % (7/10) | 4,183 | 147.0 / 112.7 | 6.9G | 10 min 42 s | 2,106,920,960 | 4,487 |
| C19-interval | D21 | — | 47,700 | 47,700 | 0 | 64.9 | 735 | 735 | 12.1 | 6.3 | 12 (4,096 ×11) | 0.742 | 33.3 % (1/3) | 4,269 | 135.9 / 110.3 | 3.3G | 1 min 9 s | 214,183,936 | 4,490 |
| C21-search | D21 | 128 | 2,600,440 | 2,573,460 | 25,634 | 1,555.8 | 1,671 | 1,654 | 12.1 | 6.3 | 348 (8,192 ×270) | 0.753 | 66.9 % (35/51) | 6,045 | 181.5 / 145.2 | 18G | 49 min 55 s | 12,014,215,168 | 4,669 |
| C21-extend | D21 | 38 | 1,303,677 | 1,297,297 | 5,981 | 1,187.1 | 1,098 | 1,093 | 12.0 | 6.2 | 243 (8,192 ×94) | 0.690 | 80.1 % (33/40) | 6,045 | 179.2 / 144.4 | 11.8G | 25 min 12 s | 6,375,755,776 | 4,915 |
| C21-qualify | D21 | — | 499,656 | 499,656 | 0 | 522.8 | 956 | 956 | 12.0 | 6.2 | 122 (4,096 ×121) | 0.673 | 66.7 % (10/15) | 4,271 | 154.4 / 124.9 | 7.4G | 12 min 6 s | 2,250,653,696 | 4,504 |
| C21-interval | D23 | — | 48,230 | 48,230 | 0 | 77.0 | 626 | 626 | 14.9 | 7.4 | 12 (4,096 ×11) | 0.768 | 33.3 % (1/3) | 4,353 | 139.9 / 111.1 | 3.5G | 1 min 17 s | 216,838,144 | 4,496 |
| C24-search | D24 | 128 | 2,029,277 | 2,006,094 | 21,844 | 1,779.9 | 1,140 | 1,127 | 16.2 | 7.9 | 288 (8,192 ×194) | 0.786 | 64.4 % (38/59) | 6,265 | 208.5 / 138.4 | 16.2G | 45 min 15 s | 9,445,285,888 | 4,708 |
| C24-extend | D24 | 49 | 1,219,867 | 1,211,590 | 7,692 | 1,539.0 | 793 | 787 | 16.2 | 7.9 | 239 (8,192 ×88) | 0.755 | 67.5 % (36/52) | 6,265 | 200.8 / 135.9 | 12.6G | 27 min 7 s | 5,940,514,816 | 4,903 |
| C24-informed | D24 | 48 | 1,588,312 | 1,371,662 | 216,081 | 1,076.5 | 1,475 | 1,274 | 16.3 | 7.9 | 267 (8,192 ×85) | 0.733 | 47.3 % (21/36) | 6,199 | 202.5 / 136.8 | 12.5G | 31 min 28 s | 6,319,890,432 | 4,607 |
| C24-qualify | D24 | — | 808,998 | 808,133 | 0 | 1,096.7 | 738 | 737 | 16.1 | 7.9 | 198 (4,096 ×197) | 0.715 | 71.0 % (22/31) | 4,435 | 169.4 / 133.2 | 10.9G | 23 min 22 s | 3,643,006,976 | 4,508 |
| C24-decomposition | D24 | — | 9,156 | 9,156 | 0 | 31.1 | 294 | 294 | 16.2 | 7.8 | 3 (4,096 ×2) | 0.797 | 50 % (1/2) | 4,415 | 120.6 / 98.2 | 3.4G | 30 s | 41,385,984 | 4,520 |
| C24-validation | FULL | — | 51,675 | 51,675 | 0 | 100.9 | 512 | 512 | 19.3 | 9.1 | 13 (4,096 ×12) | 0.798 | 50 % (2/4) | 4,559 | 158.6 / 122.9 | 4.0G | 1 min 27 s | 232,325,120 | 4,496 |
| preflight D19 / D21 / D24 | — | — | 0 | 0 | 0 | — | — | — | 9.1 / 12.0 / 16.1 | 5.3 / 6.3 / 7.8 | 0 | — | 0 % | 1,569 / 1,623 / 1,731 | ≈ 93–97 | — | — | 36,864 each | — |

Sources [V], column by column:

| Column | Source |
|---|---|
| Requested, fresh, hits, wall | the stage record's `requested`, `compute.fresh`, `compute.archiveHits`, `compute.wallSeconds` |
| Gate s | `results/jobs/<job>/events.jsonl` "attestation" `t` minus "open" `t` |
| Dataset export s | the mtime of `P4D:cache/jobs/<job>/dataset/<door>.gb2ds` minus "open" `t` |
| Batches | `receipts.jsonl` `n` |
| Σ server ÷ pool wall | the close line `kernelMs / wallMs` |
| Util., VRAM, power | `telemetry.jsonl` `utilizationPct` (instantaneous samples about every 30 s), `memoryUsedMiB` (device-wide, desktop included), `powerW` |
| Memory peak, CPU time | `P4D:results/logs/fold-*.txt` systemd "Memory peak" and "CPU time consumed" (cgroup, systemd's 1024-based units) |
| Archive bytes | `ls -l P4D:cache/jobs/<job>/archive.sqlite`, equal to `P4B:reports/diagnostics/job-archives.sizes.txt` |

Total archive size: 65,985,015,808 bytes (≈ 66.0 GB) for 14,001,785 fresh evaluations, or **4,713 bytes per fresh
evaluation** [V].

### 4.3 Per-job table: Stage B

| Job | Door | Lanes in flight | Requested | Fresh | Hits | Wall s | Req./s | Fresh/s | Gate s | Dataset export s | Batches (dominant size) | Σ server ÷ pool wall | Util. samples mean (non-zero) | VRAM peak MiB | Power max / mean W | Memory peak | CPU time | Archive bytes | Bytes / fresh |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|---:|---|---|---|---:|---:|
| C19-repro | D19 | 4 | 66,697 | 66,228 | 445 | 177.7 | 375 | 373 | 8.8 | 5.3 | 75 (128 ×16, 96 ×16) | 0.873 | 85.7 % (6/7) | 5,837 | 127.6 / 118.7 | 2.7G | 1 min 18 s | 303,292,416 | 4,580 |
| C19-search | D19 | 64 | 1,168,140 | 1,120,604 | 46,923 | 646.0 | 1,808 | 1,735 | 8.8 | 5.2 | 191 (8,192 ×84) | 0.658 | 45.8 % (12/22) | 5,907 | 185.1 / 128.9 | 9.8G | 18 min 21 s | 5,143,461,888 | 4,590 |
| C19-qualify | D19 | — | 126,682 | 126,682 | 0 | 98.1 | 1,291 | 1,291 | 8.8 | 5.3 | 31 (4,096 ×30) | 0.635 | 25 % (1/4) | 4,171 | 148.9 / 103.4 | 3.9G | 2 min 7 s | 559,173,632 | 4,414 |
| C19-interval | D21 | — | 17,688 | 17,688 | 0 | 33.4 | 530 | 530 | 11.7 | 6.3 | 5 (4,096 ×4) | 0.767 | 50 % (1/2) | 4,263 | 124.8 / 101.8 | 2.8G | 35 s | 78,811,136 | 4,456 |
| C21-repro | D21 | 4 | 71,314 | 70,756 | 495 | 350.1 | 204 | 202 | 11.6 | 6.2 | 107 (128 ×16, 32 ×16) | 0.924 | 74.8 % (10/13) | 5,401 | 131.3 / 124.9 | 3.1G | 1 min 40 s | 324,042,752 | 4,580 |
| C21-search | D21 | 64 | 1,184,121 | 1,142,375 | 41,164 | 884.2 | 1,339 | 1,292 | 11.6 | 6.3 | 194 (8,192 ×94) | 0.731 | 65.6 % (20/30) | 6,041 | 182.4 / 135.0 | 10.3G | 19 min 59 s | 5,242,867,712 | 4,589 |
| C21-qualify | D21 | — | 126,682 | 126,666 | 0 | 130.8 | 969 | 968 | 11.6 | 6.3 | 31 (4,096 ×30) | 0.712 | 60 % (3/5) | 4,259 | 161.0 / 117.0 | 3.9G | 2 min 15 s | 559,644,672 | 4,418 |
| C21-interval | D23 | — | 17,424 | 17,424 | 0 | 39.1 | 446 | 446 | 14.3 | 7.4 | 5 (4,096 ×4) | 0.790 | 31.5 % (1/2) | 4,343 | 128.2 / 103.8 | 3.4G | 36 s | 77,557,760 | 4,451 |
| C24-repro | D24 | 4 | 62,488 | 61,955 | 496 | 495.4 | 126 | 125 | 15.4 | 7.7 | 108 (96 ×32, 128 ×16) | 0.946 | 94.1 % (16/17) | 6,145 | 137.1 / 126.2 | 3.6G | 1 min 48 s | 286,990,336 | 4,632 |
| C24-search | D24 | 64 | 977,430 | 948,677 | 28,194 | 1,106.0 | 884 | 858 | 15.5 | 7.9 | 177 (8,192 ×73) | 0.779 | 73.0 % (27/37) | 6,270 | 186.2 / 135.1 | 10.3G | 18 min 51 s | 4,389,294,080 | 4,627 |
| C24-qualify | D24 | — | 126,682 | 126,682 | 0 | 172.8 | 733 | 733 | 15.5 | 7.8 | 31 (4,096 ×30) | 0.769 | 50 % (3/6) | 4,420 | 154.2 / 115.1 | 4.4G | 2 min 30 s | 560,455,680 | 4,424 |
| C24-validation | FULL | — | 17,424 | 17,424 | 0 | 49.6 | 351 | 351 | 18.5 | 9.0 | 5 (4,096 ×4) | 0.822 | 50 % (1/2) | 4,550 | 125.6 / 102.6 | 3.4G | 43 s | 77,643,776 | 4,456 |

- Sources [V]: as in §4.2, with prefix `SB:`; systemd figures from `SB:results/logs/fold-C*.log`.
- Stage B's three preflight jobs (gate 6.9 / 8.7 / 12.7 s) have no telemetry and no archive.
- Total archive size: 17,603,235,840 bytes (≈ 17.6 GB) for 3,843,161 fresh evaluations, or **4,580 bytes per fresh
  evaluation** [V].
- The search rates 1,808 / 1,339 / 884 per s equal `SB:REPORT.md` §3 [R].

### 4.4 Cost per door

| Door | Sessions | Dataset bytes | Gate s, P4 / SB | Median server ms per 8,192 batch (search), P4 / SB | Device ms per 1,000 candidates (search), P4 / SB | Search req./s, P4 (128 lanes) / SB (64 lanes) | Extension req./s (P4) | Qualify req./s, P4 / SB | Median server ms per 4,096 batch (qualify), P4 / SB | Interval / validation req./s, P4 / SB |
|---|---:|---:|---|---|---|---|---:|---|---|---|
| D19 | 1,006 | 34,219,472 | 9.1 / 8.8 | 2,278 / 2,222 | 303.6 / 374.4 | 2,197 / 1,808 | 1,396 | 1,222 / 1,291 | 1,724 / 1,835 | — |
| D21 | 1,511 | 52,091,312 | 12.0–12.1 / 11.6–11.7 | 3,424 / 3,373 | 451.6 / 558.6 | 1,671 / 1,339 | 1,098 | 956 / 969 | 2,610 / 2,707 | 735 / 530 (interval on D21) |
| D23 | 2,012 | 69,461,744 | 14.9 / 14.3 | — | — | — | — | — | — | 626 / 446 |
| D24 | 2,264 | 77,997,776 | 16.1–16.3 / 15.4–15.5 | 4,868 / 4,732 | 691.2 / 894.8 | 1,140 / 884 | 793 | 738 / 733 | 3,811 / 3,832 | — |
| FULL | 2,723 | 94,520,272 | 19.3 / 18.5 | — | — | — | — | — | — | 512 / 351 (validation) |

Sources [V]:

- Sessions: `gpu-attestations/*.json dataset.sessions`.
- Dataset bytes: the size of `cache/jobs/*/dataset/*.gb2ds`.
- Server ms: the `receipts.jsonl` `serverMs` medians and `Σ serverMs ÷ Σ n`.

Notes on the per-door figures:

- **Device time scales with door length.** Device time per 1,000 candidates per session is constant at about 0.30 ms
  [R, derived]: 303.6 / 1,006 = 0.302; 451.6 / 1,511 = 0.299; 691.2 / 2,264 = 0.305.
- **Search throughput falls less than proportionally.**
  - Measured ratios D19 : D21 : D24 are 1 : 0.76 : 0.52 (P4) and 1 : 0.74 : 0.49 (SB).
  - The inverse of the session ratios is 1 : 0.67 : 0.44 [R, derived].
- **Archive bytes per fresh evaluation do not depend on the door** [V]: 4,414–4,941 in every job from D19 to FULL,
  except the 584-evaluation ablation job (6,123).
- **VRAM at the 8,192-batch search peaks** at 5,911 (D19) / 6,045 (D21) / 6,265 (D24) MiB device-wide (P4). The
  attestations' planned bytes are 5,448,925,184 / 5,482,020,864 / 5,531,369,472 [V] (`memory.plannedBytes`; free
  32,339,984,384).

### 4.5 Lanes in flight versus throughput, within jobs (island rounds)

Fresh GPU evaluations between consecutive island barriers [V]. Evaluations come from the `receipts.jsonl` timestamps
and `n`; barriers are the last "island i" line per index in the stage log (`P4D:results/logs/<job>.log`,
`SB:results/logs/<job>.log`; 1-s resolution).

| Door | Job | Lanes in the round | Round s | Fresh / s | Median batch |
|---|---|---|---|---|---|
| D19 | SB C19-search | 64 → 58 → 41 → 20 → 7 | 132, 103, 99, 90, 60, 43 | 1,851, 1,946, 1,890, 1,462, 1,093, 567 | 8,192 … 368 |
| D19 | P4 C19-search | 128 → 111 → 81 → 54 → 39 | 252, 156, 145, 132, 105, 92 | 2,262, 2,575, 2,453, 1,974, 1,647, 1,405 | 8,192 … 6,505 |
| D19 | P4 C19-extend | 34 (islands 0–6), 32 (7–8) | 77–101 | 1,282–1,595 | 2,812–7,264 |
| D21 | SB C21-search | 64 → 55 → 39 → 22 → 9 | 189, 137, 135, 117, 87, 62 | 1,392, 1,450, 1,329, 1,087, 817, 442 | 8,192 … 1,600 |
| D21 | P4 C21-search | 128 → 117 → 93 → 68 → 47 | 318, 203, 226, 190, 161, 139 | 1,800, 1,965, 1,634, 1,597, 1,331, 1,102 | 8,192 … 7,440 |
| D21 | P4 C21-extend | 38 (0–6), 35, 31 | 108–141 | 898–1,221 | 3,686–7,060 |
| D24 | SB C24-repro | 4 → 3 | 87, 73, 73, 70, 71, 69 | 104, 107, 92, 91, 92, 92 | 256 … 112 |
| D24 | SB C24-search | 64 → 57 → 46 → 31 → 25 | 199, 156, 160, 149, 123, 111 | 843, 887, 785, 727, 584, 487 | 5,951 … 1,283 |
| D24 | P4 C24-search | 128 → 119 → 99 → 77 → 65 | 334, 234, 216, 210, 183, 169 | 1,089, 1,148, 1,203, 1,022, 950, 824 | 8,192 … 4,405 |
| D24 | P4 C24-extend | 49 (0–6), 44, 38 | 135–186 | 631–780 | 2,656–6,144 |
| D24 | P4 C24-informed | 48 (0–3), 3 (island 4) | 265, 215, 211, 144, 76 | 1,398, 1,584, 1,510, 1,256, 237 | 7,887 … 96 |

- **Finishing phase** (rungs 2–3 and refinement, all lanes): 2,377 / 1,830 / 1,402 fresh per s in the P4 searches
  (median batch 8,192) [V].
- **Fixed-door reference** [R] (`P4B:PROTOCOL.md` §6.2, `P4B:results/engineering/E5/bench.json` `rate`): 8 concurrent
  lanes on D24 ran 232 requested per s. The bench's log header labels it "non-official … purpose benchmark"; its
  `backend` field is the GPU.
- **Same door, by lanes in flight** [V]: on D24 the rate was 126 per s (4 lanes, SB repro), 884 (64, SB search) and
  1,140 (128, P4 search).

### 4.6 Concurrent versus sequential jobs: documented measurements

Both studies ran their official jobs sequentially (§4.1). The concurrency figures below are measured in GPU Phase 4
[R] (`docs/gpu/README.md` §4–§4a; `research/gpu-phase4/GPU_CONCURRENCY_BENCHMARKS.md` §2–§11;
`GPU_OPERATING_RECOMMENDATIONS.md` §1–§3). Phase 4 measured binary gb3 on Assignment 3 / Assignment 2 jobs without the
risk envelope. No concurrency measurement exists for gb7 or gb8 with the envelope (§6).

| Measurement (Phase 4, RTX 5090, batch 8,192, 8 host workers unless stated) | Result |
|---|---|
| Separate processes on the device | time-sliced; their kernels never run at the same time (per-batch server time 1,790 → 3,450 → 5,000–5,140 → 6,790–7,070 ms at k = 1–4) |
| A3-shaped jobs, steady state, aggregate | k = 1 2,683 ev/s; k = 2 3,345 (1.25×); k = 3 3,487 (1.30×); k = 4 3,471 (1.29×); each job 1.6× / 2.3× / 3.1× slower |
| Two complete A3 jobs at once (Mode A confirmation) | 887.4 / 887.6 s each vs 583.6 s alone (1.52× longer each); both in 887.6 s vs 1,167.1 s sequential (1.31× aggregate) |
| A2-shaped (main-thread-bound) jobs | 1.55× at k = 2, 1.72× at k = 3 |
| Small-batch mini schedule / device-saturated FULL stress | 1.03× / 1.04× at k = 2 |
| One study split into k concurrent jobs | k = 2 1.063–1.073×; k = 3 0.914×; k = 4 0.748× (smaller batches; latency-bound kernels) |
| Batch size, one job | 4,096: 15.5 % slower; 16,384: 4.5 % slower than 8,192 |
| Host workers | 8 vs 4: 583.9 vs 611.7 s; 12 workers gain nothing; once the GPU is shared, workers per job hardly matter |
| Silicon use | kernel-active 73–75 % at k = 1; GPM SM activity 34 % (k = 1) to ≈ 46 % (k ≥ 3); SM occupancy ≈ 1 % |
| Kernel batch curve (device-saturated, D19) | device ms per 1,000 candidates 934 (2,048), 477 (4,096), 249 (8,192), 151 (16,384), 104 (32,768) |
| Shared queue (merged launches) | projected 1.22× over time-slicing (not built) |
| Resources | about 5.1 GiB VRAM per A3 job server at 8,192 on D19 (6.5 GiB FULL detail + risk); host 3.1–5.0 GiB per job; the cgroup also counts the SQLite page cache |

## 5. What limited the extensions: evidence by candidate cause

| Candidate cause | Evidence | Mark |
|---|---|---|
| **Island count (cap)** | Budget-bound means the island cap was reached with a trigger firing, so the cap is the binding limit by definition. Raising it from 6 to 9 converted all CTRL lanes (2/2, 4/4, 8/8) and 8/9 + 2/2 EXP GA0.VA0 lanes, using 7–9 islands. Only 1/32, 2/32 and 0/32 EXP GB0.VD1 lanes converted (C21 R5; C24 R3, R10; C19 none). | [V] §1.3–§1.4 |
| **Structural coverage (new feasible behaviour classes)** | In all 94/94 still-budget-bound EXP lanes the last trigger includes CLS, and in 84/94 it is CLS alone. In the 279 extension-island measurements of those lanes, CLS > 0 held every time, with 7.8–12.6 new classes per island on average. The EXP GB0.VD1 class count is 128–343 against 25–48 for CTRL GB0.VD1, because the staged pattern multiplies the control patterns by 8 (16 → 128) [R, `P4src:space.ts`]. The new classes are spread over all 8 staged patterns, OFF included. The CTRL GB0.VD1 trigger stopped firing at islands 4–5 in most lanes. | [V] §1.5–§1.6 |
| **Genuine lack of improvement in the performance triggers** | At the extension islands the median gains in hypervolume, robust and centre net are 0–0.6 %, 0 % and 0 %. HV, ROB or NET > 5 % fired in 0–10 of 90–96 measurements per component. Over islands 7–9 the median Δ best centre net is $0, the mean is +1.3 % / +2.1 % / +2.8 %, and 11 / 12 / 11 of 32 lanes improved at all (max +11.9 % / +19.8 % / +18.1 %). | [V] §1.5, §1.7 |
| **Refinement moves** | There is a single refinement pass (`refinePasses` 1). At C21 and C24, nearly all refinement starts of **both arms** (56–64 of 64 per arm·cell) moved in that pass and were then stopped by the pass limit; at C19, 32–42 of 64 did. The move-set bound never bound. Refinement runs after the islands and does not enter the stop reason. | [V] §1.7 |
| **Global sampling breadth** | The screen is fixed at 512 per lane for both arms; EXP splits it into 8 × 64 by staged pattern while the shared genes are CTRL's screen. Plausible screens per lane fell from 121–135 (C19) to 46–67 (C21) and 7–9 (C24) in both arms, mainly "DD > ceiling". At C24, promotion by net fills only 237–286 of 2,048 slots per arm·cell. This affects both arms equally; it does not separate budget-bound from converged lanes. | [V] §1.2 |
| **Resource guards** | None fired. No "resource guard" decision appears in any round of any search, extension or informed job. The largest lanes were 28,549 of 42,000 (search), 37,410 of 57,000 (extension) and 41,354 of 93,000 (informed). The ledger used 14.3 M of the 25 M ceiling. The systemd memory peak was at most 18G (MemoryHigh 44G), VRAM at most 6,270 MiB device-wide. All jobs had 0 failures, 0 CPU-scored evaluations and 0 capacity retries. | [V] §1.2–§1.3, §2, §4 |
| **Extension mechanics (cost)** | The block re-ran each budget-bound lane from scratch in a new archive. 55.6–60.4 % of its fresh evaluations replayed the base islands, 24.4–27.1 % were the new islands 6–8 and 13.0–20.0 % were finishing. | [V] §1.7 |
| **Informed lanes (C24)** | All 48 stopped on "triggers not met" with 4–5 of 8 islands; none was budget-bound. | [V] §2 |

## 6. Evidence gaps

1. **Qualified value V for the base runs of the re-run lanes.** It was never computed: the extension result replaced
   the base result. The effect of the extension on V cannot be measured from the records. §1.7 uses the search-level
   rung-1 lane state (`islands[-1].after`) instead.
2. **The trigger's class key is not recorded.** The key is `cell | control pattern | funded`, and only its count is
   recorded (`after.classes`). The `byClass` keys use the Growth stratum instead of the funded set, so the "staged
   pattern of new classes" in §1.6 is a proxy. The 384-class universe for EXP GB0.VD1 is an inference from observed
   maxima.
3. **No per-island or per-round throughput record.** §4.5 is reconstructed from git-ignored stage logs (1-s
   timestamps) and receipt timestamps. Log-based figures exist only on this machine: `P4D:results/logs/`,
   `SB:results/logs/`.
4. **No direct GPU utilization measure.** The only measures are 30-s instantaneous `nvidia-smi` samples (0 or 100 %
   most of the time) and Σ server time ÷ pool wall. GPM SM activity and occupancy were not recorded for any job of
   either study; they exist only for Phase 4's gb3 benchmarks.
5. **No per-process RSS.** Memory figures are systemd cgroup "Memory peak" values, which include the SQLite archive's
   page cache. The preflight jobs have no systemd record. VRAM is device-wide and includes the desktop (about
   1.5–1.7 GiB at rest in the preflight samples).
6. **Concurrency for the accepted backends was never measured.** No job of either study ran beside another, and no
   concurrency benchmark exists for gb7 or gb8 with the risk envelope (or gb8's staged-stop capability). §4.6 quotes
   Phase 4 (gb3, Assignment 3 / Assignment 2, no envelope).
7. **Gate overhead is not split.** The gate time (open → attestation) is not divided among dataset export, server
   start, smoke kernel, parity mini-set and checks. The dataset-export estimate uses a file mtime with 1-s precision.
   The time from attestation to the first receipt (P4: 6–22 s for lane jobs, 70–121 s for qualification) is not
   itemised.
8. **Archive sizes are not decomposed.** They are on-disk sizes, including SQLite pages and WAL checkpoints; the
   archives were not opened. Bytes per fresh evaluation are size ÷ fresh.
9. **The in-flight de-duplication residual is not itemised.** Requested − fresh − hits (for example 1,251 at P4 C19
   search) is not broken down per lane.
10. **Stage B has no extension block.** No "after the block" budget-bound fraction exists for Stage B's CTRL (P0) or
    EXP30 arms.
11. **The E5 benchmark is labelled inconsistently.** The log header ("non-official CPU run") and the record's GPU
    `backend` field disagree. Its 232 per s rate is quoted as reported.
12. **Stopped refinement paths have no continuation.** Whether pass-capped paths would have kept improving with more
    passes is not recorded.
