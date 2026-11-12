# New L0 trading-session re-optimization (vg-l0-session-hold)

Backend research only. The VGT + GDX D1 + Growth portfolio of **New L0** (Priority 5B `C24/L0/informed/R1#1 profit`:
D1·GDX + D1·VGT + Growth·VGT, Growth·GDX OFF, one shared $100,000 slot, lifecycle L0) is re-optimized with the
recovered reference method **NL0 1.0.0** (`docs/research/methods/NEW_L0_METHOD.md`) under an experimental maximum-hold
unit — **NYSE trading sessions instead of calendar days** — with at least the original effort, and compared as A
(New L0, calendar days), B (New L0, sessions) and C (re-optimized, sessions).

- Brief: `brief/BRIEF.md` · Protocol: `PROTOCOL.md` · Amendments: `AMENDMENTS.md` · Adoption: `STANDARD_ADOPTION.json`
- Recovery (Phase 1): `recovery/` · Checkpoint: `RESEARCH_RECOVERY.md` · Commands: `RUN_COMMANDS.md` · Report: `REPORT.md`
- Code: `src/vg-l0-session-hold/` · CLI: `npm run vg-l0sh -- <command>` from the repository root

**Status: complete (2026-11-12), awaiting review.** Calendar-day holds remain preferable: trading sessions hurt New L0's
fixed phenotype (B − A −$41,863.67 on development) and the re-optimized C ($373,676.67) still trails New L0 on
development, validation and full history. Frozen labels: B vs A *harmful*, C vs A *harmful*, C vs B *conditional
profit/risk trade-off*. New L0 stays the frozen benchmark. See `REPORT.md`.
