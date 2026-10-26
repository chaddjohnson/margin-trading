# Margin trading — project instructions for Claude Code

## Context recovery (applies to every session)

- For any substantial multi-stage task, follow @docs/claude/context-recovery.md and, at session start and after any context compaction, reread that guide and the task's on-disk recovery checkpoint before executing work.
- Task state (results, hashes, commands, process IDs, next steps) belongs in the task's own checkpoint — `research/<study>/RESEARCH_RECOVERY.md` or `WORK_RECOVERY.md` — never in this file or the guide.

## Project

- Overview, data layout and commands: `README.md` and `docs/`.
