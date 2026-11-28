# Handoff ZIP — identity and verification (brief Phase 7, portable handoff package)

| Item | Value |
|---|---|
| File | `research/gdx-d1-growth/bundle/gdx-d1-growth-handoff.zip`; a stable copy at `~/.local/share/margin-trading-gpu/handoffs/gdx-d1-growth-handoff.zip` (with `.sha256`) |
| sha256 | `ad17b93e76c2653a8095d509e0557d4bd7c95b5a41f84d74b9ca13b490c4bd6b` (also `SHA256.txt`; verify with `sha256sum -c SHA256.txt` in this folder) |
| Size | 7,575,388 bytes (37,748,092 bytes uncompressed; 936 entries, 790 files) |
| Built from | branch `research/gdx-d1-growth`, commit `c1e6ba14841a2e60c6e55e82f3ef5c8dacf3b3c9`, verified equal to `git ls-remote origin research/gdx-d1-growth` before packaging (`IDENTITY.txt` inside the ZIP) |
| Built | 2026-11-27T07:34:30Z by `tools/gdx-d1-growth/bundle.sh` |
| Integrity | `zip -T`: OK; after extraction, `sha256sum -c SHA256SUMS.txt`: all 790 files OK; the handoff-folder copy re-verified (`sha256sum -c`, `unzip -tq`: no errors) |
| Secrets / personal-data scan | clean: key/token/password patterns, personal e-mail addresses and every value in the local `.env` were searched for in the extracted tree; none found |
| Excluded by check | no SQLite database, `.zst` archive, binary, CUDA build, market-data file or file over 20 MB is in the ZIP (`OMITTED_ARTIFACTS.md` inside lists what was left out — the 429 MB of per-lane search and qualification records committed in git, the 25 GB of compressed job archives on Apollo — with sizes, hashes and restore commands) |

Reading order: `READ_FIRST.md` inside the ZIP. Exact tree: `git checkout c1e6ba14841a2e60c6e55e82f3ef5c8dacf3b3c9`.
The ZIP was committed in the commit after `c1e6ba14` (this folder), so the ZIP's own copy of `RESEARCH_RECOVERY.md`
describes the state just before it was built.
