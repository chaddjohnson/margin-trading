# Margin trading — project instructions for Claude Code

## Delivery: commit and push at completion (standing preference)

> At completion, commit task-related work and push the task's branch to its configured remote without asking for routine confirmation. This applies to research, documentation and negative results. Stage only task-related changes, preserve unrelated work, and exclude secrets and inappropriate large data artifacts. Verify the push and report branch and commit. If a concrete problem prevents a safe push, preserve the work and explain the blocker. Do not force-push, merge into main, deploy, or publish outside the repository without separate authorization.

- Recorded at the user's request in the Priority 3 brief (`research/vg-d1-growth-joint/brief/BRIEF.md` §1, 2026-11-08).
  It replaces the earlier routine "ask before committing or pushing" practice; broker access still needs the user's
  explicit request.
- Verify the push with `git ls-remote origin <branch>` (equal to the local commit) and record it in the task's
  checkpoint.

## Reporting: written analysis and tables only, no visuals (standing preference)

> Report research with written analysis, Markdown tables and machine-readable results only. Do not create charts,
> plots, SVGs, screenshots, images, dashboards, HTML visual reports, PDFs or other visual artifacts, and do not spend
> time rendering or inspecting report graphics.

- Recorded at the user's request in the Priority 5A brief (`research/vg-growth-funding-lifecycle/brief/BRIEF.md` §1,
  2026-11-09) and enacted as optimization standard 2.0.0 §7.7. It replaces the earlier permission for backend report
  charts. Visuals of earlier studies are preserved, never deleted or regenerated. Only a brief that explicitly asks for
  a visual overrides it (recorded as a departure). Strategy Lab's own application interface is outside this rule.

## Context recovery (applies to every session)

- For any substantial multi-stage task, follow @docs/claude/context-recovery.md and, at session start and after any context compaction, reread that guide and the task's on-disk recovery checkpoint before executing work.
- Task state (results, hashes, commands, process IDs, next steps) belongs in the task's own checkpoint — `research/<study>/RESEARCH_RECOVERY.md` or `WORK_RECOVERY.md` — never in this file or the guide.

## Optimization research — read the standard first (mandatory)

- Before any new optimization study, or any material continuation of one (a new search, lane, budget, cutoff, validation or selectable candidate), read in full `docs/research/OPTIMIZATION_STANDARD.md` (its current version is registered in `docs/research/optimization-standard.versions.json`) and the study's own `PROTOCOL.md` and `AMENDMENTS.md`. This applies to bounded diagnostics of frozen selections too (scope `diagnostic`).
- A new study starts from `docs/research/STUDY_PROTOCOL_TEMPLATE.md`, records `research/<study>/STANDARD_ADOPTION.json` (version, sha256, read/adoption times, protocol hash, date split, objective/roles, risk denominator, budget, deviations) and must pass `npm run research-preflight -- --study research/<study>` before its first substantive stage; new runners call `requireStandardAdoption` (`src/research-standard/preflight.ts`) in code. The preflight checks the declaration and hashes, not understanding.
- A frozen study keeps the standard version it pinned; adopting a newer version is an explicit amendment. Completed studies are never retrofitted.
- The standard changes only when the user agrees a process change: a new version, a change-log entry (§8) and the new sha256 in the registry (`npm run research-preflight -- --hash`). Never edit it silently; the preflight then fails for every study.

## Project

- Overview, data layout and commands: `README.md` and `docs/`. Research priorities and their status: `docs/research/ROADMAP.md`.
