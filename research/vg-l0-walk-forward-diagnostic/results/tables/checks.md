# Engineering gates and bug-audit checks

All checks passed; see the records for every value.

| Check | Result | Record |
|---|---|---|
| G1 audited records verify against their seals | 36/36 | `results/gates/gates.json` |
| G2 evaluation digests at this checkout (Priority 3, 5B, shadow) = sealed | 3/3 equal | `results/gates/gates.json` |
| G2 session study digest at 18674b39 = sealed | equal | `results/replays/session.json` |
| G4 sequential paths recomputed from the mark caches (net, DD, peak, trough, every slice net and reset DD) | 4/4 equal to the cent | `results/gates/gates.json` |
| G3 fold primaries replayed = sealed fold rows (every record field) | 18/18 | `results/replays/*.json` |
| Causal prefix: training-door run = sealed selection centre (every field) | 12/12 | `results/replays/*.json` |
| G3 every evaluated fold row replayed = sealed | 172/172 | `results/replays/evaluated-rows.json` |
| D7 regenerated selection families = sealed training statistics | 12/12 | `results/neighbours/selection-neighbourhoods.json` |
| D8 consecutive-bar moves > 10% in VGT / GDX D24 | 0 / 0 (of 743918 / 1189831 bars) | `results/gates/d8.json` |
| D8 splits of VGT / GDX in the split register | VGT 8:1 on 2026-04-21 (after every development door) | `config/market-events/splits.json` |
| D8 maximum-hold exits that came before the configured hold | 0 of 100 | `results/gates/d8.json` |
| D8 slice reconciliation: Σ fresh lots + carried change − slice net | max |diff| $0.03 (cent rounding of per-lot nets) | `results/gates/d8.json` |
| Leakage: each fold selection committed before its slice evaluation (git) | 9/9 (5B, session, shadow; seconds before) | git log of `results/folds/*/selection.json` and `evaluation.json` |
