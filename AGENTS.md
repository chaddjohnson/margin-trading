# Agent instructions

This repository keeps its agent instructions in [CLAUDE.md](CLAUDE.md). They apply to any coding agent, not only
Claude Code. Read it first, and the documents it links:

- [docs/claude/context-recovery.md](docs/claude/context-recovery.md) — checkpoints for long, multi-stage work.
- [docs/research/OPTIMIZATION_STANDARD.md](docs/research/OPTIMIZATION_STANDARD.md) — mandatory before any
  optimization study or material continuation (and bounded diagnostics of frozen selections): record
  `research/<study>/STANDARD_ADOPTION.json` and pass `npm run research-preflight -- --study research/<study>`.
- [docs/research/ROADMAP.md](docs/research/ROADMAP.md) — the research priorities and their status.
- [CLAUDE.md § Delivery](CLAUDE.md#delivery-commit-and-push-at-completion-standing-preference) — at completion,
  commit task-related work and push the task's branch without routine confirmation (no force-push, merge into main,
  deployment or outside publication without separate authorization).

Rules are not duplicated here; change the linked documents instead.
