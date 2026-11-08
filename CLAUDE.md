# Margin trading — project instructions for Claude Code

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
