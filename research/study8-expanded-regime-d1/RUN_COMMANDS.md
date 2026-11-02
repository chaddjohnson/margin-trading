# Study 8 — run commands

**Where:**
- Run every command from the **Study 8 worktree root**, `/home/chad/projects/margin-trading-study8` (branch
  `research/study8-expanded-regime-d1`), with Node v24.21.0.
- The main checkout (`/home/chad/projects/margin-trading`, branch `tools/study7-local-runners`) and `main` do **not**
  contain Study 8. Its code, records and runner exist only on this branch, uncommitted until the user decides.

```
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH
cd /home/chad/projects/margin-trading-study8
```

## 1. The study (as executed; every stage is write-once and gated by the local hash chain)

| Stage | Command |
|---|---|
| Timing pilot (pre-freeze only) | `npm run study8 -- pilot` |
| Freeze | `npm run study8 -- freeze-protocol` |
| Code acknowledgement after an amendment | `npm run study8 -- acknowledge-code <ID>` (E1 was the only one) |
| Engineering gates | `npm run study8 -- parity` |
| Search, all 30 jobs | `research/study8-expanded-regime-d1/scripts/run_jobs.sh research/study8-expanded-regime-d1/scripts/jobs-search.txt 12 > research/study8-expanded-regime-d1/results/runlogs/orchestrator-search.txt 2>&1` |
| One search job | `npm run study8 -- search <G\|V\|VG\|VXR\|VXRG\|VXRKG> <F19\|F20\|F21\|F23\|F24>` |
| Seal | `npm run study8 -- seal search` (with `--acknowledge <ID>` if a job's door opened twice) |
| Qualification, all 30 | `research/study8-expanded-regime-d1/scripts/run_jobs.sh research/study8-expanded-regime-d1/scripts/jobs-qualify.txt 12 > research/study8-expanded-regime-d1/results/runlogs/orchestrator-qualify.txt 2>&1` |
| Seal | `npm run study8 -- seal qualify` |
| Selection freeze | `npm run study8 -- freeze-selection` |
| Pre-test audit | `npm run study8 -- record-audit research/study8-expanded-regime-d1/reviews/PRE_TEST_AUDIT.md` |
| Test doors, in this order | `npm run study8 -- test F19`, then `test F20`, `test F21`, `test F23`, `test F24` |
| Confirmation | `npm run study8 -- test F24 --confirm` |
| Research configurations | `npm run study8 -- research-configs` |
| Verify | `npm run study8 -- verify-chain` (chain, files, door log and integrity pins) |
| Tables | `python3 research/study8-expanded-regime-d1/scripts/build_tables.py search qualify selection test folds study7` |
| Unit tests | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study8-expanded-regime-d1/tests/study8.test.ts src/study8-runners/tests/runners.test.ts` |

A completed stage refuses to run again; see `RESEARCH_RECOVERY.md` for the do-not-rerun list.

## 2. Local strategy runner (`npm run study8-run`)

See `src/study8-runners/README.md`. Fixed $100,000 single slot, 11% simple interest, 5 bps **per side** by default.
Outputs go to a new directory under `evaluations/study8-runs/`. Runs ending on 2026-10-29 at 5 bps are reconciled
against the sealed Study 8 F24 test record; any other window or cost reports "not applicable".

```
npm run study8-run -- list
npm run study8-run -- run s8-vg-best
npm run study8-run -- run s8-vxrkg-best --end 2026-10-29 --cost-bps 5
npm run study8-run -- compare --all
npm run study8-run -- compare s8-g-best gdx-portfolio-aware vgt-primary b5-frozen --end 2024-12-31
```

The executed commands and their verified outputs are recorded in §3 after the study.

## 3. Executed and verified runner commands

Run on 2026-11-01, 23:04:50–23:14:19Z, from the Study 8 worktree root, after the F24 test was sealed (while F24
`--confirm` ran; the confirmation stayed identical). The logs are `results/runlogs/runner-*.txt`. `list` printed to
the terminal and has no log file; its resolution is shown in the rows below. The outputs are in new, git-ignored directories under `evaluations/study8-runs/`.

| Command | Exit | Verified result |
|---|---:|---|
| `npm run study8-run -- list` | 0 | every alias resolves against the sealed records; `s8-<track>-best` = G #12 (ambiguous), V #25, VG #1, VXR #15, VXRG #3, VXRKG #8 |
| `npm run study8-run -- compare --all` | 0 | the six track bests, B1 and B5 on one window (2016-01-04 → 2026-10-29), 5 bps, 11%: **8/8 reconciliations PASS**. Study 8 aliases matched the sealed F24 record trade by trade (VG 56 lots, G 62, VXRKG 62, … 0 mismatches); B1 and B5 matched Study 7's sealed final door (21 and 95 lots) |
| `npm run study8-run -- run s8-vg-best --quiet` | 0 | PASS, totals and 56 lots trade by trade; full ledger in `trades.csv` |
| `npm run study8-run -- run s8-vxrkg-best --end 2024-12-31 --quiet` | 0 | reconciliation **not applicable** (different end); a training-window run |
| `npm run study8-run -- run s8-vg-best --cost-bps 10 --quiet` | 0 | reconciliation **not applicable** (different cost) |
| `npm run study8-run -- run s8-vxr-4 --quiet` | 0 | a shortlist member without a role: PASS on totals only (no sealed ledger is kept for non-holders) |
| `npm run study8-run -- run vxrg-frozen --quiet` | 0 | the frozen VXRG subset: PASS trade by trade against the F24 record's control |
| `npm run study8-run -- run s8-xyz-best` | 2 | unknown alias: a usage message |
| `npm run study8-run -- compare s8-g-best gdx-portfolio-aware vgt-primary b5-frozen --end 2024-12-31` | 0 | the training window to 2024-12-31: all four reconciliations **n/a**. G #12 $159,206 (DD $30,359), G-PA $167,510 ($34,134), B1 $135,359 ($19,534), B5 $412,651 ($26,510) |

**`compare --all` output** (`results/runlogs/runner-compare-all.txt`; one window 2016-01-04 → 2026-10-29, arming
2017-06-15, 5 bps per side, 11% simple interest, fixed $100,000 single slot):

| Alias | Status | F24 rank | Books | Net | Realized | Unrealized | Interest | Friction | Minute DD | Daily DD | Lots (open) | Refused | Reconcile |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `s8-g-best` | T ambiguous | #12 | GDX | $190,647 | $188,590 | $2,057 | $25,586 | $6,257 | $30,359 | $29,549 | 62 (1) | 0 | PASS |
| `s8-v-best` | T pass | #25 | VGT | $174,488 | $174,488 | $0 | $43,036 | $2,209 | $21,330 | $18,434 | 21 (0) | 0 | PASS |
| `s8-vg-best` | T pass | #1 | VGT+GDX | $308,742 | $309,071 | −$329 | $44,844 | $5,727 | $31,225 | $28,725 | 56 (1) | 13 | PASS |
| `s8-vxr-best` | T pass | #15 | VGT+XBI+XRT | $234,146 | $234,146 | $0 | $35,019 | $4,135 | $22,020 | $19,617 | 40 (0) | 15 | PASS |
| `s8-vxrg-best` | T pass | #3 | VGT+XBI+XRT+GDX | $252,513 | $252,513 | $0 | $30,951 | $5,942 | $21,192 | $18,541 | 58 (0) | 26 | PASS |
| `s8-vxrkg-best` | T pass | #8 | VGT+XBI+XRT+KRE+GDX | $258,886 | $258,886 | $0 | $24,049 | $6,342 | $25,616 | $23,996 | 62 (0) | 34 | PASS |
| `vgt-primary` (B1) | frozen | — | VGT | $176,260 | $176,260 | $0 | $36,405 | $2,206 | $19,534 | $15,817 | 21 (0) | 0 | PASS |
| `b5-frozen` (B5) | frozen | — | five books | $484,637 | $486,208 | −$1,571 | $53,041 | $9,720 | $26,510 | $23,789 | 95 (1) | 78 | PASS |

**Where to run.** These commands run only on the Study 8 branch (this worktree). They need its sealed records, its
research configurations and `src/study8-runners/`. The Study 7 aliases inside `study8-run` (`vgt-primary`,
`b5-frozen`, `vg-frozen`, …) also work with `npm run study7-run` on the Study 7 runner branch.
