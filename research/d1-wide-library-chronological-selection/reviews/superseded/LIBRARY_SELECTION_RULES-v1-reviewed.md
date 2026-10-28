# Library construction and selection rules (operational; bound by the protocol freeze)

This file restates `PROTOCOL.md` §5–§8 as the exact steps the code (`src/d1-wide-library-selection/library.ts`,
`search.ts`, `families.ts`, `fast.ts`) executes. Constants are in `context.ts` (`rules`, `newSearch`, `triggers`,
`decision`). Where this file and the code disagree, the code's behaviour is a defect to be reported, never silently
reinterpreted.

## 1. Inputs per (fold, pool, ETF)

- The fold's training universe (`trainingUniverse(fold)`; through the cutoff only), 5 bps, 11%, the fixed $100,000
  slot, arming 2017-06-15.
- The pool's candidates: ARCH = every reconstructed row of the source window's archive (Sobol and local search);
  NEW = this study's Sobol (1,024) and refinement (≤ 128) candidates of the fold; NEW-S = NEW's Sobol candidates;
  ALL = ARCH ∪ NEW. Duplicated grids are kept once.
- Per candidate (training): trades, closed, open, net (liquidation-equivalent), best, worst, minute DD, daily DD,
  interest, friction, occupied days, net per occupied day, J_s, T, credible, trade signature, trade path (credible
  only), entry calendar years.

Scores:
- **J_s** = net − max(0, best trade) − max(0, minute DD − 20,000) (the source's).
- **T** = net − max(0, minute DD − 20,000) − max(0, −worst trade − 10,000) (this study's; no best-trade deduction).
- **credible** ⇔ trades ≥ minTrades(fold) ∧ minute DD ≤ 35,000 ∧ net > 0.

## 2. Families

1. Credible candidates C, each with path P = (sorted entries, held-session bitset).
2. d(a, b) = max(1 − |H_a ∩ H_b| / |H_a ∪ H_b|, 1 − 2·m(a, b) / (n_a + n_b)), m = greedy chronological matches of
   entry sessions with |Δ| ≤ 3.
3. Order C by net descending, then grid key ascending. For each c: join the first existing family F (in creation
   order) with max_{f∈F} d(c, f) ≤ 0.5; else create a new family {c}.
4. Per family: size; support = #members whose stage is `sobol` or `new-sobol`; best-J_s member; best-T member;
   medoid = argmin_m Σ_{f∈F} d(m, f) (ties: higher net, then smaller key).

## 3. Neighbourhood draws (the source instrument)

`neighbour([{symbol, vector}], stage, cls, d)` from `src/d1-ranked-preemption/space.ts` (common random numbers per
(stage, class, draw), never per vector): every coordinate moves −u / 0 / +u with probability ⅓ (N1) or ±2u (N1A2), u
the step unit (X 5, Y 1, stop 5, hold 1, L 5, buffer 5, P 5, W 10 grid units), reflected at the box. Stage labels:
fold A `standalone:fold-a`, fold B `standalone:fold-b` (the source's own, so A0r on ARCH reproduces the sealed J_nb),
S folds `d1-wide-library:<fold>`. A draw is evaluated like any training candidate.

- J_nb = median J_s over N1 draws 0..15; T_nb = median T over the same draws.
- A3 draws: N1 0..31 and N1A2 0..15 (48).

## 4. Arms

### A0r (and A0)
1. Checked = the first 8 of C ordered by J_s (desc, then key), skipping a repeated trade signature.
2. Representative = argmax J_nb over Checked (ties: J_s desc, key asc). If C is empty: the highest-J_s candidate with
   ≥ 1 trade, flagged non-credible (no nominee).
3. Nominee = the representative iff J_nb > 0 ∧ J_s > 0; score = J_nb.
4. Library = [representative] + greedily, over the first 32 of C by J_s, each candidate whose entry-session set has
   Jaccard distance ≥ 0.5 from every chosen one, while |library| < 4.
5. A0 = the sealed source representative/library; nominee iff the sealed status is survivor. On ARCH, A0r must equal
   A0 for every ETF (checked).

### A1(K)
1. Families ordered by their best-J_s member's J_s (desc, key); L1 = the first 64 members; L1(K) = its first K.
2. For each member: J_nb. Eligible ⇔ J_nb > 0 ∧ J_s > 0.
3. Nominee(K) = argmax J_nb over eligible members of L1(K) (ties: J_s desc, key asc); score = J_nb.

### A2(K)
1. Families ordered by their best-T member's T (desc, key); L2 = the first 64 members; L2(K) = its first K.
2. For each member: T_nb. Eligible ⇔ entry years ≥ 2 ∧ T_nb > 0.
3. Nominee(K) = argmax T_nb over eligible members of L2(K) (ties: net per occupied day desc, key asc); score = T_nb.

### A3(K)
1. Families ordered by support (desc), then the medoid's worst trade (desc, i.e. the smaller loss first), then the
   medoid's key; L3 = the medoids of the first 64; L3(K) = its first K.
2. For each member: the 48 draws' share with net > 0 (≥ 0.75), share with minute DD ≤ 35,000 (≥ 0.75), the centre's
   worst trade ≥ −15,000, the number of distinct eligible training catalog families containing an entry (≥ 2;
   catalog = the standalone audit's `catalogOf` on the training universe's daily closes, so no post-cutoff close is
   read; an entry belongs to the episode whose (peak, rebound end] contains its entry session).
3. Score = P25 of the 48 draw nets (linear interpolation, type 7). Eligible ⇔ all four filters ∧ P25 > 0.
4. Nominee(K) = argmax P25 over eligible members of L3(K) (ties: the draws' median net desc, key asc).

### A4(K) (nested)
1. Library = L2(K) of the pool (the A2 order).
2. For each member, from the sealed selection-window evaluation: V_sel, lots entered in the window, windowed minute DD.
3. Eligible ⇔ lots ≥ 1 ∧ windowed minute DD ≤ 35,000 ∧ V_sel > 0.
4. Nominee(K) = argmax V_sel (ties: T_nb desc, key asc); score = V_sel.

### Across-ETF
Per (arm, K, pool): the nominees ordered by score (desc, then symbol); the first 5 advance, each in its own slot.

## 5. New search (per ETF and fold)

1. `sobolVectors(symbol, 1024, 'd1-wide-library-v1:new-search')`; drop any grid present in any source archive of the
   symbol (fold-a, fold-b, final); evaluate the rest.
2. Families of the credible Sobol candidates (§2). Starts, each from a not-yet-used family: 4 by the family's best T
   (families ordered by that T), 2 by support (families ordered by size desc, then medoid key; start = medoid), 2 by
   the lowest minute DD (families ordered by their lowest-DD member's DD; start = that member); unfilled quotas are
   filled from the T order.
3. For round r ∈ {0, 1} and each start s: RNG `Rng.from('d1-wide-library-v1', 'refine', fold, symbol, s, r)`;
   8 moves (indices 0–5 `mutateOne(centre, rng, origin)` = one coordinate ±1..3 step units; 6–7 `mutateAll` = every
   coordinate −u/0/+u); a move whose grid was already evaluated for the symbol or is archived is redrawn (≤ 20
   attempts); stop issuing moves once 128 refinements were evaluated for the symbol. After the round the start moves
   to the best credible move (by T desc, key) if its T is strictly higher than the current one's.

## 6. Evaluation-window figures

From one continuous run from 2016-01-04: V over (b, e] = liquidation-equivalent mark at e − at b; windowed minute and
daily DD restart at b; lots entered after b. The fast path (the source's windowed replay) serves every library
member; the full engine re-runs every nominee at 0/2/5/10 bps and must agree with the fast path's V to the cent.
