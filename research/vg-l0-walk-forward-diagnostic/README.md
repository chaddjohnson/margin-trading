# Walk-forward robustness failure investigation (New L0 family)

A bounded **diagnostic** (standard 2.1.0, scope `diagnostic`): why the earlier-cutoff procedures behind New L0 primary
(VGT + GDX D1 + VGT Growth) and its two follow-ups repeatedly selected portfolios whose 2020–2024 drawdowns exceeded
$35,000, and what to change before TSLA/MSFT. No search, no re-optimization, no rule or parameter change, no deployment;
FULL (2025–2026) never opened.

- **Start here:** [REPORT.md](REPORT.md).
- **Brief:** [brief/BRIEF.md](brief/BRIEF.md). **Protocol:** [PROTOCOL.md](PROTOCOL.md) (frozen,
  `results/protocol-freeze.json`); [AMENDMENTS.md](AMENDMENTS.md) (A1 caps, A2 regimes, A3 coverage check);
  [STANDARD_ADOPTION.json](STANDARD_ADOPTION.json).
- **Tables:** `results/tables/` — `audit.md`, `chronology.md`, `removal.md`, `prevalence.md`, `selection.md`,
  `neighbours.md`, `coverage.md`, `regimes.md`, `checks.md`, `summary.json`.
- **Sealed records:** `results/gates/`, `results/replays/`, `results/selection/`, `results/neighbours/`,
  `results/regimes/`, `results/coverage/` (sha256 in `results/seals.jsonl`); door log `results/doors.jsonl`; logs
  `results/logs/`.
- **Code:** `tools/vg-l0-walk-forward-diagnostic/` (no `src/` change; the audited studies' code is imported unchanged).
- **Commands:** [RUN_COMMANDS.md](RUN_COMMANDS.md). **Checkpoint:** [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md).
