# Alternative drawdown-policy diagnostics D1–D3 (brief Phase D) — specification

**Nonbinding.** Computed on the common candidate populations of both pilot arms after the search; never a search,
gate, ranking, promotion, refinement or exit input; trades and exit rules unchanged; compared separately from the
primary envelope. Code: `src/risk-envelope/diagnostics.ts` (pure functions, tests `src/risk-envelope/tests/diagnostics.test.ts`),
on the portfolio path of `src/vg-l0-risk-metrics/metrics.ts portfolioPath` (one funded slot: M = marked net, M^L =
liquidation net, R = banked net; no capital flows). Illustration on representative paths:
`research/gpu-phase7/results/diagnostics/diagnostics-demo.json` (development doors; references and labelled engineering
edge subjects, never candidates). No coefficient below is an approved threshold.

## Common definitions

- C0: the fixed initial trading allocation. Equity E(t) = C0 + M(t) (marked) or C0 + M^L(t) (liquidation basis).
- Path chronology: every regular-session minute close while a lot is held and every session close; a closed lot adds a
  point at its final exit (M = R there). The whole training door unless a window is named.
- Banked profits stay in the account (no withdrawals): they raise E and therefore any peak-equity denominator.

## D1 — drawdown as a percentage of peak equity

- Ep(t) = the running maximum of E (strict: it moves only to a strictly higher value; Ep(start) = C0, since M = 0 at the
  first instant). **D1 = max_t [Ep(t) − E(t)] ÷ Ep(t)** — the largest decline as a share of the peak it fell from: a
  maximum of ratios, not the dollar maximum DD divided by some peak (the two instants can differ).
- Edge cases: Ep ≥ C0 > 0 always (defined); no decline → 0; a loss from the start is measured against C0.
- Behaviour: the denominator grows with accumulated (banked or open) profit, so D1 is **far more permissive than a % of C0
  for profitable paths** — New L0 on D24: conventional DD $19,460 = 19.5 % of C0 but D1 = 7.3 %; every illustrated edge
  configuration (DD ≈ $35k–$40k of C0) had D1 between 15 % and 38 %. A 40 % D1 limit would bind almost nowhere on this history.

## D2 — capped hybrid allowance

- allowed(t) = min(cap × C0, max(floor × C0, slope × Ep(t))); illustrative coefficients floor 40 %, slope 30 %, cap 60 %.
- **D2 utilization = max_t [Ep(t) − E(t)] ÷ allowed(t)**; ≤ 1 passes (illustration).
- Regimes: Ep ≤ (floor ÷ slope) C0 = 1.33 C0 → the floor (40 % of C0); 1.33 C0 < Ep < (cap ÷ slope) C0 = 2 C0 → 30 % of Ep;
  Ep ≥ 2 C0 → the cap (60 % of C0). The allowance is evaluated at the peak the drawdown is measured from.
- Behaviour on the illustration: the edge configurations' binding instant was mostly in the floor regime (utilization
  0.58–1.0001; 0.875 for a $35k drawdown from a peak below 1.33 C0 — there D2 equals a 40 %-of-C0 cap) or the
  peak-proportional regime (0.64–0.96); nine near-$40k configurations reached ≥ 0.9999 at the floor and four of them
  exceeded 1 (a drawdown just above $40k from a peak below 1.33 C0); New L0 reaches the cap regime (peak equity > $200k)
  with utilization 0.32.
  The cap keeps the allowance bounded (never more than $60k on $100k) even for very profitable paths.
- Edge cases: floor ≤ cap required (refused otherwise); coefficients in whole percent; exact limits.

## D3 — profit-component-aware attribution

Two lenses, both exact, **never added to or subtracted from each other**:

1. **Account-level interval partition** at the conventional maximum drawdown's window [t_p, t_t] (the strict tracker's
   peak and first trough), with Mp = M(t_p), Mt = M(t_t) and the banked high **H = max(0, max_{u ≤ t_t} R(u))**:
   - U — unbanked-profit giveback = max(0, Mp − max(H, Mt)) (profit above the best banked level, never banked, given back);
   - E — banked-profit erosion = max(0, min(Mp, H) − max(0, Mt)) (the part between the banked high and the starting capital);
   - F — starting-capital loss = max(0, min(Mp, 0) − Mt) (equity below C0).
   U + E + F = Mp − Mt = DD exactly (an interval partition: no double counting). H may exceed Mp (a partial sale while
   the remainder was under water): then U = 0.
2. **Lot-level attribution** (`metrics.ts attributeDrawdown`, METRIC_SPECIFICATION §6): DD = Σ_lots [π_i(t_p) − π_i(t_t)],
   each lot split into giveback above its own break-even and the deepening below its funded principal; offsets (lots that
   gained inside the window) are negative giveback terms.

Why both: a lot can be far below its own principal while the account is still above its banked high minus that loss — the
loss then appears as **E (banked erosion)**, not F. Illustration (D24 engineering subject `rc2-7dffbfdc7…`): lot level $55.8k
below principal with a −$20.8k giveback offset; account level $10.2k unbanked giveback + $24.8k banked erosion + $0 below C0.
New L0 (D24): DD $19,460 = U $9,124 + E $10,336 + F $0 (lot level: giveback $9,124, principal $10,336).

- Proposed nonbinding qualification view for D3 (illustration only, [D-13]): "giveback-tolerant" = DD ≤ 60 % of C0 ∧ banked-
  capital DD (whole path, max_t [H(t) − M(t)] ≥ E + F of the window) ≤ 25 % of C0 ∧ trade PL ≤ 25 % of funded principal.
- Edge cases: no drawdown → no window (all components 0); a window starting at the first instant (peak = 0); H = 0 (nothing
  banked yet: U covers everything above 0).

## Reporting (pilot)

For both arms' populations (every rung-3 fit, shortlist and qualified member; their confirmation neighbourhoods for the
primaries): D1, D2 utilization and regime, D3 (U, E, F; lot-level giveback / principal), on the marked and liquidation
bases; counts of members each diagnostic would admit or exclude **beside** (never instead of) the envelope decisions; and
the excluded-but-promising regions (if any) as a recommendation for a separately authorized optimization.
