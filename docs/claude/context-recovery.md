# Context recovery for substantial work (Claude Code working procedure)

This is the repository's standing procedure for keeping long, multi-stage work recoverable across context compaction,
interruptions and new sessions. It is imported by the root `CLAUDE.md`, so it applies to every Claude Code session in
this checkout without being pasted again.

**Scope.** Any substantial, multi-step task: research studies, optimisation runs, builds, data migrations, long code
edits or refactors that span many files or more than one sitting. Short answers, single-file fixes and other trivial
edits need no checkpoint.

**Project-wide rule versus task state.** This file and `CLAUDE.md` hold only durable, general behaviour. Task state —
results, hashes, commands, process IDs, decisions, next steps — lives in the task's own checkpoint file. Never append
volatile results, secrets, credentials, account identifiers, personal or machine-specific paths, or large logs to
`CLAUDE.md` or to this guide.

## 1. The task-local checkpoint

- **Research tasks:** `research/<study>/RESEARCH_RECOVERY.md`, next to the study's protocol and records.
- **Other work** (builds, migrations, refactors): `WORK_RECOVERY.md` in the directory that owns the work (or the
  directory the task's own documents already use). If the task already has a conventional checkpoint file, keep using
  it; do not start a second one.
- The checkpoint is the **authoritative on-disk record of where the task stands.** Conversation memory, the session
  summary after compaction and Claude's auto-memory are not; when they disagree with the checkpoint and the records it
  points to, the files win.
- A task's frozen protocol, amendment log and sealed stage records outrank the checkpoint: the checkpoint points to
  them and records their hashes; it never replaces them.

A checkpoint opens with a **top screen** — the few lines a fresh session needs to act correctly: the time of the
update (UTC); the exact current stage; the authoritative protocol/spec path and hash (and the amendment head); which
stages are complete and which are not; any process still running (with its task/process ID and log); and the single
next command. Everything else follows below it, in this order (omit sections that do not apply):

1. **Header:** task name, one-line status, and whether the task is complete (part of the top screen).
2. **Environment:** working directory (repository-relative where possible), branch, `HEAD`, worktree (if not the main
   checkout), working-tree state (`git status --short` summary: which changes are intended), runtime versions
   (e.g. Node from `.node-version`), memory/heap settings, worker counts. No secrets: say *where* credentials are read
   from, never their values.
3. **Authority:** the authoritative protocol/spec file(s) with their current hashes, the amendment-log head, and the
   sealed records with their hashes.
4. **Stage table:** one row per stage with status `not started` | `running` | `complete` | `blocked`, the exact command
   and its working directory, start/end times or measured runtime, output paths, record hashes, the guard that
   refuses a rerun, and its **resume semantics**: whether an interrupted run resumes mid-stage (and how) or needs a
   deterministic complete-stage replay (with the original configuration and seeds, labelled as a rerun). For a stage
   with several sealed rounds or folds, update the checkpoint at each round, not only at the stage's end.
5. **Constants:** random seeds or seed derivations, budgets, data-access cutoffs (which dates or files each stage may
   read), thresholds — or a pointer to the frozen file that defines them.
6. **Running work:** for each background process, its PID and/or harness task ID, command, start time, log path,
   expected outputs and how to tell whether it finished cleanly.
7. **On disk versus in memory:** what exists only in the conversation (decisions not yet written, partial analysis)
   and must be written before it can be relied on.
8. **Guards:** an explicit **do-not-rerun** list (completed or sealed stages, data that must not be reopened) and the
   **next authorised step**, with any precondition that must hold before it starts.
9. **Disclosures:** incidents, deviations and anything the final report must mention.

## 2. Operational contract

### 2.1 At the start of a substantial task

1. Read the repository instructions (`CLAUDE.md` and this guide) and any task brief.
2. Locate the task's checkpoint; if none exists, create it before the first expensive or irreversible step.
3. Inspect existing frozen protocols, amendment logs, decision logs and sealed records that the task depends on, and
   identify safe restart boundaries (stages that are write-once, resumable, or must run in one piece).
4. Record the branch, `HEAD`, working-tree state, baseline hashes of anything that must not change, artifact
   locations and the outputs each stage is expected to produce.
5. **Do not rerun a completed study or stage merely because the session is new.** Completed means its sealed records
   exist and verify.

### 2.2 Continuous checkpoints

- Update the checkpoint after **every significant milestone**, not only when context is running out. For research
  that means at least: protocol commitment or freeze, data ingestion/validation, each implementation gate (tests,
  parity, reviews), each optimisation or search round, every sealed selection, each full evaluation, and the final
  audit. For other work: after each completed phase, migration step or batch of edits that would be costly to redo.
- **Write it to disk, then verify it:** reread the file, and recompute the hashes it quotes (`shasum -a 256 <file>`)
  for the records written in that milestone. A checkpoint quoting a hash that was never recomputed is not verified.
- Include the items in §1: stage status, exact commands with working directory and runtime, immutable record hashes,
  protocol/amendment head, seeds, budgets, data cutoffs, Git state, active PIDs or task IDs, logs, outputs, which
  artifacts are on disk versus only in memory, and the do-not-rerun and next-step guards.
- Take every timestamp from the clock (`date -u`), never estimate one; say which time zone file listings use.
- Anything a later stage depends on — review reports, prepared patches, the exact text of commands and their
  arguments — goes into the task directory, not only into the conversation or a session scratch directory that a new
  session may not have. Write commands in full; an elided argument cannot be executed after a recovery.
- Keep sensitive values out of it.

### 2.3 Near a full context

- If a reliable context-utilisation figure is visible to Claude and it reaches roughly **90%**, or the interface warns
  that the context is nearly full, or before starting another large stage in an already-long session: **refresh and
  verify the checkpoint first.** When utilisation cannot be measured, refresh it before lengthy tool sequences and
  whenever a long operation finishes.
- Do not invent a utilisation percentage, do not claim to monitor the interface, and do not poll undocumented context
  interfaces. Compaction can happen earlier than any threshold, which is why §2.2 checkpoints at milestones.

### 2.4 Before compaction

- If the current bounded operation can be finished safely and quickly, finish it and seal its results. Otherwise
  record the still-running command, its process and task identifiers, durable log paths and how to recover it.
- Verify output files, hashes, locks and frozen stage records before relying on them.
- **Never kill a background job just to compact.** When compaction looks imminent, saving critical state comes before
  finishing an expensive round, and the next costly stage is not launched until the checkpoint is safe.

### 2.5 Compaction control depends on the host

- Claude may be unable to start `/compact` itself (desktop, IDE and remote hosts differ). Where a manual command is
  available to the user, suggest it at a safe checkpoint; otherwise rely on automatic compaction.
- Never claim that compaction happened, promise to prevent it, or assume a 90% signal will be seen.
- Do not disable automatic compaction or block it with a hook to preserve context.

### 2.6 After compaction, an interruption or a new session

Before writing anything:

1. Explicitly reread `CLAUDE.md` and this guide, the task's checkpoint, the authoritative protocol with its amendments,
   and the sealed stage manifests/records the next stage depends on.
2. Check background work: harness task IDs, `ps -p <pid>`, log tails, lock files and partial outputs. **If a process
   may still be running, inspect it before launching anything that could duplicate it.**
3. Validate the recorded hashes and stage statuses against the files on disk.
4. Resume **only the next authorised incomplete stage**, respecting freezes and every data-access door (training,
   validation, holdout). If a stage cannot resume mid-way and must rerun, rerun it with its original exact
   configuration and seed, and label the rerun in the checkpoint and the records. Never restart or alter a stage just
   because its subprocess no longer has visible output in the conversation: check its log and outputs on disk.
5. Record in the checkpoint that a recovery was performed (when, after what) and what was verified (files, hashes,
   processes) before continuing.

### 2.7 When the state cannot be trusted

If the current state cannot be reconstructed from files on disk, or a freeze or integrity check fails: **stop and
report the blocker.** Do not regenerate records, reopen validation or holdout windows, change criteria, rewrite a
sealed outcome, or reconstruct decisions from conversational memory.

### 2.8 Exercising the procedure

The procedure can be tested without touching research results: snapshot the checkpoint, have a fresh context (a new
headless session or a fresh subagent) read only the instruction files and the snapshot, and check that it names one
unambiguous next action and distinguishes sealed results from active or uncheckpointed work. This is a documentation
test; it never authorises rerunning a stage or forcing a compaction.

## 3. Hooks (optional, not installed)

Claude Code documents repository-scoped hooks in `.claude/settings.json` (shared) or `.claude/settings.local.json`
(not shared). The relevant events are `SessionStart` (matchers `startup`, `resume`, `clear`, `compact`; its stdout is
added to Claude's context), `PreCompact` (can block compaction — a recovery hook must never do so) and `PostCompact`
(cannot affect compaction). A small `SessionStart`/`compact` hook that only prints a reminder to reread this guide and
the active checkpoint would be the least invasive option. **None is installed; adding one needs the user's approval.**
Any hook must be non-blocking, must not print secrets or store transcripts, must not interfere with background jobs,
and must not block automatic compaction. No hook exposes context utilisation to Claude (only the status line receives
it), and no hook can turn unwritten reasoning into a checkpoint.

The root `CLAUDE.md` imports this guide with Claude Code's `@path` syntax (resolved relative to `CLAUDE.md`, ignored
inside code spans and fenced blocks). The project-root `CLAUDE.md` is loaded at session start and re-injected from disk
after compaction; keep the import line outside backticks.

## 4. Notes for this repository

- Completed studies under `research/` are frozen: their protocols, manifests, sealed records and phenotypes are never
  edited, re-hashed or rerun. A new question gets a new study namespace and its own protocol.
- Several studies verify a code manifest spanning `src/**/*.ts`; adding source files later changes that manifest.
  Check a historical study at its own commit (e.g. a detached `git worktree`) rather than relaxing its guard.
- Market data under `data/<SYMBOL>/` is local and git-ignored (see `docs/canonical-dataset-migration.md`). A
  checkpoint should record data hashes, not assume they are versioned.
- Committing, pushing and broker access always need the user's explicit request.
- If work happens in another `git worktree`, record its path in the checkpoint; `git worktree list` shows them.
