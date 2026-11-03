# Dispositions — methodology re-review 3 (v1.1 dispositions, contract, matrix, code)

Written before any Stage 1c strategy ran on market data and before the protocol freeze. Each finding of
`METHODOLOGY_REREVIEW_3.md` with its disposition and where it lands (PROTOCOL v1.2, ENGINE_CONTRACT, MECHANISM_CATALOG,
EXPERIMENT_MATRIX v1.1 regenerated, code, tests).

| # | Sev. | Disposition | Change |
|---|---|---|---|
| 1 | MAJOR | **Adopted** | While frozen by B, a high-mode (E10) reference keeps updating ref := max(ref, bHigh) and only firing is suppressed; low mode stays frozen with the restart. Contract §11.2, PROTOCOL §4.3, engine; tests: a rally above the trade's highest close during the cooldown gives no buy at the release (and an R3F release entry is shown separately as the declared state-persist case); a −∞ reference after an S1 boundary exit gives no buy through a flat release. |
| 2 | MAJOR | **Adopted** | Π-NET-off (Π-NET's picks with the rules removed) is an `evaluate` path and Π-NET's item (d) is assessed against it (PROTOCOL §9.1, §11 item 5; `evaluate.ts`, `analysis.ts`). |
| 3 | MINOR | **Adopted** | The minute-rule freeze applies only for R.exitIndex < s < R.exitIndex + C + 1 (never in the exit session), so C = 0 is identical to no B for every family; test added (E09, C = 0). |
| 4 | MINOR | **Adopted** | PROTOCOL §4.3 and contract §11.5: an in-session minute-rule fill has offset > 0; a minute order carried to the next open is an opening fill with offset 0. |
| 5 | MINOR | **Adopted** | Contract §11.2/§11.4 state that the minute `bBlocks` counts sessions frozen while Stage 1b's `allowed` held (whether or not the rule would have fired), that the freeze applies whether or not `allowed` holds, and that the old policy's discarded decision at an adopt-flat boundary is counted. |
| 6 | MINOR | **Adopted (carry the label)** | A first-entry decision at the adoption close discarded by B or C keeps the `adoption` label for the next first-entry decision of the same uninterrupted signal state (`adoptionDeferred`, contract §11.4; engine; test). Rubric (e) therefore never counts a B/C-delayed adoption as a fresh first entry. |
| 7 | MINOR | **Adopted** | Rule A's mode-next market sale pays the stop-slippage stress (like a triggered stop); mode open pays opening slippage (contract §11.5; engine; test). |
| 8 | MINOR | **Adopted** | Twins are resolved by the entry/exit projection through the 000 cell's vector map; inert = equal path hash and |Δnet| ≤ $10⁻⁶ (`develop.ts`, PROTOCOL §7.1). |
| 9 | MINOR | **Adopted** | Each cell's first-pass (J17) champions, reasons and φ values are snapshotted before deep rescoring and sealed (`firstPassChampion` in the cells payload); the first-pass null and the §7.2 statistics use them. |
| 10 | MINOR | **Adopted** | The matrix states pair-level seed labels and a `streams` section with every stream convention (global, local, joint, fixed-parent, nulls, J128, missing bars, poison, parity). |
| 11 | MINOR | **Adopted** | PROTOCOL §7.3: no path check in the NET list; ties in every list go to the pair whose first matrix cell has the lower index. |
| 12 | MINOR | **Adopted** | PROTOCOL §7.4: fixed-parent rule boxes are the declared ones; forced FP falls back to the parent without a champion; the gated outcome is stored explicitly (`adopted` / `parent` / `none`). |
| 13 | MINOR | **Adopted** | PROTOCOL §11 (d): "active rule" = mask ≠ 000 (inertness reported); d1 (fold-C pick only) and d2 (A, B, D picks only) stated separately; retention Σ W(Π1) ≥ Σ W(off) − 0.25 |Σ W(off)|; d1 worded "2022 outcome acceptable" with the explicit statement that W_C ≥ −$2,000 passes even if the rules did not help and that without a rule 2022 rests on (b)'s floor (`analysis.ts` updated). |
| 14 | MINOR | **Adopted** | "(target-year-informed)" applies to every 2022 statement attributable to any rule event (A, B or C); B's reach on #12/#13 added to the register. |
| 15 | MINOR | **Adopted** | Π-m-cross for every mask with C, Π-m-open for every mask with A (fold picks), and P\*_H's C-cross and same-print-A variants (continuous) are predeclared (PROTOCOL §9.1, §10; code). |
| 16 | MINOR | **Adopted** | OAT adds ±1, ±2 units for integer dimensions (N, C) and ±0.1, 0.5, 1, 2 pp for every percentage dimension (X, Y, stop fractions); rule × stop-distance grids (5 × 5 per rule dimension) for every neighbourhood pick (PROTOCOL §10; `evaluate.ts`). |
| 17 | MINOR | **Adopted** | PROTOCOL §9.1 lists the brief §8 per-trade/per-path items (MAE, holding duration, peak exposure, loss streak, time invested, campaign drawdowns, unrealised giveback), Π1's losing transition exits and release entries, and the rule-only-transition part of ΔΣW; §7.6 states the heap and command; §13 lists the variants not run; the disposition files enter the precedence chain where they state commitments. |
| 18 | MINOR | **Adopted** | Tests added: E10 under a cooldown, the −∞ seed case, C = 0 on E09, an S1 b+1 pending own-rule losing exit feeding the new pick's B, an early-close session for A, X/Y quantisation, A's stop slippage; PROTOCOL §12 lists them and explains "regime reset" and "an order waiting during the cooldown". 36/36 pass. |
| 19 | NOTE | **Adopted** | The reader decodes only the first 32 bytes of a line for the date check; the rest is decoded only for lines before the bound. |
| 20 | NOTE | **Adopted** | PROTOCOL §12: `data/partitions.json` is hashed and its dates are parsed by the shared loader. |
| 21 | NOTE | **Adopted** | Per-cell planned-count assertions during develop (first pass, deep, fixed parent); the pool's door is a required argument. |
| 22 | NOTE | **Adopted** | Widened edges are quantised to the dimension's grid. |
| 23 | NOTE | **Adopted** | PROTOCOL §7.1 restricts the twin claim to global and reference indices. |
| 24 | NOTE | **Adopted** | The rule-only-transition part of Σ W(Π1) − Σ W(Π1-off) is reported (PROTOCOL §9.1; report tables). |
