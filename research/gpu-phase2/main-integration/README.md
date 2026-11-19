# Documentation-only integration into `main` (prepared)

`main` (`108c241b`) lacks the research code and several sections of this branch's `CLAUDE.md` that belong to other,
non-integrated studies. The integration therefore adds only this study's documentation, built from `main`'s tree
(temporary index + `commit-tree`; the checkout and branch stay untouched), then merges `main` back into
`research/gpu-phase2`:

| File on `main` | Source |
|---|---|
| `CLAUDE.md` | `CLAUDE.main.md` here: `main`'s text + the GPU section, worded for a branch without the enforcement code |
| `docs/research/OPTIMIZATION_STANDARD.md`, `optimization-standard.versions.json`, `STUDY_PROTOCOL_TEMPLATE.md`, `templates/STANDARD_ADOPTION.template.json` | this branch (identical files; `main`'s copies equal this branch's base, so the change is exactly 2.2.0 → 3.0.0) |
| `docs/gpu/README.md`, `PARITY_CHECKLIST.md`, `FEATURE_MATRIX.md`, `.github/pull_request_template.md`, `CONTRIBUTING.md` | this branch (new files) |
| `docs/research/ROADMAP.md` | `main`'s text + one GPU Phase 2 row |

Never on `main`: `src/gpu-backend/`, `src/gpu-phase2/`, `src/research-standard/gpuPolicy.ts`, `package.json`
(the purpose gate), `config/gpu-backend/`, tools, the CUDA evaluator.
