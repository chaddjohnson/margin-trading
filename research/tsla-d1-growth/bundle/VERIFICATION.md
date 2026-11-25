# Handoff ZIP — identity and verification (brief §9, item 12)

| Item | Value |
|---|---|
| File | `research/tsla-d1-growth/bundle/tsla-d1-growth-handoff.zip` |
| sha256 | `a29a51273f15019a49d8175ce1cfc55085886e38ae0f3abd4b2df00e7d0caa5a` (also `SHA256.txt`; verify with `sha256sum -c SHA256.txt` in this folder) |
| Size | 4,180,819 bytes (22,024,726 bytes uncompressed; 918 entries, 775 files) |
| Built from | branch `research/tsla-d1-growth`, commit `447ac7cee7b263a27297df6e79f29b52bbcf4e70`, verified equal to `git ls-remote origin research/tsla-d1-growth` before packaging (`IDENTITY.txt` inside the ZIP) |
| Built | 2026-11-25T23:02:56Z by `tools/tsla-d1-growth/bundle.sh` |
| Integrity | `zip -T`: OK; after extraction, `sha256sum -c SHA256SUMS.txt`: all 775 files OK |
| Secrets / personal-data scan | clean: key/token/password patterns, personal e-mail addresses and every value in the local `.env` were searched for in the extracted tree; none found |
| Excluded by check | no SQLite database, `.zst` archive, binary, CUDA build, market-data file or file over 20 MB is in the ZIP (`OMITTED_ARTIFACTS.md` inside lists what was left out, with sizes, hashes and restore commands) |

Reading order: `READ_FIRST.md` inside the ZIP. Exact tree: `git checkout 447ac7cee7b263a27297df6e79f29b52bbcf4e70`.
The ZIP was committed in the commit after `447ac7ce` (this folder), so the ZIP's own copy of `RESEARCH_RECOVERY.md`
describes the state just before it was built.
