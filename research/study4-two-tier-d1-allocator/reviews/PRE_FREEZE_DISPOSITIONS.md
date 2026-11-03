# Pre-freeze review dispositions

Two independent read-only reviews of the draft protocol (revision 1) were commissioned at 2026-10-29T19:42Z and returned
≈19:55Z and ≈19:57Z: `PRE_FREEZE_REVIEW_1_METHODOLOGY_LEAKAGE.md` (R1) and `PRE_FREEZE_REVIEW_2_EXECUTION_CAUSALITY.md`
(R2), both verbatim. Both concluded "freeze after fixes"; neither required a redesign. Revision 2 of PROTOCOL.md,
ENGINE_CONTRACT.md, SEARCH_PLAN.md, EXPERIMENT_MATRIX.json and the source audit implements the dispositions below. No
Study 4 outcome existed when any of this was decided.

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| R1-1 verdict object and nominee undefined | BLOCKER | **Accepted.** The verdict object is each experiment's chained procedure (carry, from 2016 with F20's pick, measured from the 2019-12-31 liquidation mark; reset compared with B5 under the same resets); the nominee is the experiment's sealed H pick, eligible only if the chained label is "historically promising" and the H pick meets H feasibility and E3; parsimony order 4B → 4C → 4D-A → 4D-B → 4D-C; controls, SA, S-raw, S-risk and ablations never nominated | PROTOCOL §10.2, §12.3 |
| R1-2 "new B5" credited to two-tier | MAJOR | **Accepted.** E6 now requires ΣΔ − ΣΔ(own same-budget deep-only control) ≥ $10k with a positive yearly margin in ≥ 3 of 4 years, plus ≥ $10k over the shallow-off ablation; the B5-deep + pick-shallow decomposition is reported (not gating: a jointly optimized shallow tier need not be separable, and the clean contrast is the control); ablation bias stated | PROTOCOL §12.1–12.2 |
| R1-3 preservation gameable | MAJOR | **Accepted.** One-to-one matching; matched-altered only by the deep book of a reoptimized/removed B5 symbol, never called preserved; per-lot contribution capped at min(candidate, B5); frozen-B5 experiments gate on exact + delayed only; count-weighted floor 0.85; top-5 winners (development) and top-10 (2020–2023) never missed; rationale written | PROTOCOL §8, §9.3, §12.1 |
| R1-4 shallow band too deep on volatile ETFs | MAJOR | **Accepted.** Upper bound min(0.45σ, 15.0%); frequency role check on every symbol: decisions ≥ max(2/yr, 1.5 × the same vector at X = 0.85σ) | PROTOCOL §5 |
| R1-5 deep role via continuation | MAJOR | **Accepted.** Total-decision checks (≤ 1.5 × incumbent + 2 on B5 symbols; ≤ the busiest B5 book's yearly rate elsewhere); deep floor ρ(w) = min X₀/σ of B5's books; every neighbourhood contains X₀ | PROTOCOL §5 |
| R1-6 rubric lacks execution, fundability, specificity | MAJOR | **Accepted.** E7b (latency +5 min, 25 bps stop slippage, next-open stops), E9 (≥ 8 shallow lots in ≥ 3 years), E10 (idle-clean net > 0 and ≥ 50% of ΣΔ, else "reshuffle") | PROTOCOL §12.1 |
| R1-7 E8 exemptions | MAJOR | **Accepted.** Largest paired contribution (any category), largest 20-session paired cluster, symbol share ≤ 70% | PROTOCOL §9.4, §12.1 |
| R1-8 no selection-null gate | MAJOR | **Accepted** (with the robust step of the null scaled to the subsample: top 5 × 24 perturbations, to keep the null affordable). E11: ΣΔ ≥ the null's 75th percentile and pooled Spearman > 0 | PROTOCOL §10.6, §12.1; SEARCH_PLAN §7 |
| R1-9 selection weaker than verdict | MAJOR | **Accepted.** DD ≤ min($35k, B5 + $5k); development year share ≤ 70%; leave-one-year-out; robust step = joint ±10% perturbations on the top 50 structurally distinct | PROTOCOL §8 |
| R1-10 4D budget too small | MAJOR | **Accepted in part.** Floors raised 5× (240,000 for 4D-A/A0P/B/B0, 400,000 for 4D-C/C0 per window; 8.8 million in total), four seeded islands per experiment (seed stability for every experiment; replaces the separate alternative-seed reruns), a refinement floor for every cardinality × policy × gate cell, λ ∈ {0.5, 0.75, 0.9}, G1d, P4 D ∈ {0,1} kept, hypervolume recorded. Not the full 300k/500k: the measured cost (25 ms per fresh evaluation) puts 8.8 M at roughly three hours of the machine, already ~6× the reviewed plan | SEARCH_PLAN §5–6 |
| R1-11 no same-budget P0 contrast | MAJOR | **Accepted.** 4D-A0P added; brief Q4's allocator answer comes from 4D-A versus 4D-A0P | PROTOCOL §7.4, §12.1 |
| R1-12 B5 hindsight in challengers | MAJOR | **Accepted.** Registered with direction of bias; 4D-B vs 4D-B0 named the clean contrast; to be repeated in the next-gate answer | Audit §5.7; PROTOCOL §12.3 |
| R1-13 parity door gap | MAJOR | **Accepted.** Parity door refused once CODE_FREEZE exists (unless evaluation is authorised); parity traces only the registered B5/B4/B1 phenotypes; append-only door log sealed into stage records | PROTOCOL §3; doors.ts |
| R1-14 policy count | MINOR | **Accepted.** 15 policies with P0M; 4B no-fill handling; the 4B pick's gate carries into 4C | PROTOCOL §7.3 |
| R1-15 E4 not computable | MINOR | **Accepted.** Chained overlay defined; 35% condition stated; declared upfront that without an exact-parity overlay no candidate can be "historically promising" | PROTOCOL §10.8, §12.1 |
| R1-16 4A library collapse | MINOR | **Accepted.** Stratified by X tertile with min distance 0.15 (≤ 12 per symbol); yearly/regime nets, falling-knife losses, timing correlation, neighbourhood profiles | PROTOCOL §7.1 |
| R1-17 idle-clean wording | MINOR | **Accepted.** | PROTOCOL §9.4 |
| R1-18 tier/priority genes | MINOR | **Accepted in part.** Shallow priority order is a searched gene; assigning new books to the deep tier is 4D-C's question (disclosed for 4D-A) | PROTOCOL §7.4; SEARCH_PLAN §5 |
| R1-19 post-evaluation fixes | MINOR | **Accepted.** | PROTOCOL §11 |
| R1-20 embargo hygiene | MINOR | **Accepted.** Metadata registered; whole-file hashes forbidden; caches keyed by dataset id (prefix hash); doors main-thread only; non-B5 2023 cross-check only at evaluation; parsing stops at end + 1 day 06:00Z | PROTOCOL §2–3; audit §5.8–5.10; doors.ts |
| R1-21 registration and reporting | MINOR | **Accepted**, except the P2L "B-R1" fixture: B-R1 preempts B5 books with each other, which a tier policy cannot express (R2-3); P2L parity is with `replayPreemptive` on one-deep/one-shallow pools instead | PROTOCOL §4, §5, §7, §10; ENGINE_CONTRACT §10 |
| R1-22 shadow semantics | NOTE | **Accepted** (disclosed as the chosen state machine; funded-path reset a future hypothesis) | PROTOCOL §6; ENGINE_CONTRACT §5.10 |
| R1-23 other disclosures | NOTE | **Accepted** (same-symbol round trip, ex-dividend dips, zero-switch P3/P4 ≈ P0) | PROTOCOL §2, §8; ENGINE_CONTRACT §5.12 |
| R2-1 stale-test look-ahead | MAJOR | **Accepted.** Cancel only when the exit trigger was known before the purchase; `orphan-mirror` for an exit at the purchase's own print; intrabar exit → buy at the open and close at the exit price; fixtures | ENGINE_CONTRACT §5.4, §10 |
| R2-2 switch event position | MAJOR | **Accepted.** Sales and purchases after exits and before fills; intrabar exception {stop level, trigger minute close}; abort then intrabar own exit | ENGINE_CONTRACT §3, §5.3 |
| R2-3 P2L described wrongly | MAJOR | **Accepted.** Renamed "legacy execution mechanics under tier priority"; no reservation cancel, own-exit auction abort, end-of-data rule; parity with `replayPreemptive` on one-deep/one-shallow pools | ENGINE_CONTRACT §5.5, §10 |
| R2-4 mirror lots on virtual economics | MAJOR | **Accepted.** Binding rule stated; slippage, net-versus-virtual and condition-false exits recorded and reported; own-managed mirror registered as a future hypothesis (not tested) | ENGINE_CONTRACT §5.11; PROTOCOL §9.1 |
| R2-5 closing-print rule | MINOR | **Accepted.** `firstTradeAfterDecision` at sale bar start + 60 s; closing-auction cutoffs an inherited limitation | ENGINE_CONTRACT §5.4 |
| R2-6 estimate price | MINOR | **Accepted.** Defined; booked = tested net asserted | ENGINE_CONTRACT §5.2–5.3 |
| R2-7 P4 contradiction | MINOR | **Accepted.** P4 never fill-tests; WAIT consumes no entry; refusals during WAIT counted | ENGINE_CONTRACT §5.2, §5.6 |
| R2-8 fill test as IOC limit | NOTE | **Accepted** (stated) | ENGINE_CONTRACT §5.3 |
| R2-9 superseded = late funding | MINOR | **Accepted.** P0M policy added (4C, 4D genome, 4E ablation); superseded/late mirrors attributed separately | ENGINE_CONTRACT §5.7–5.8; PROTOCOL §6, §7.3, §10.1 |
| R2-10 same-symbol switches | MINOR | **Accepted** (kept, disclosed, counted) | ENGINE_CONTRACT §5.12 |
| R2-11 end of window | MINOR | **Accepted.** | ENGINE_CONTRACT §9 |
| R2-12 chained accounts | MINOR | **Accepted** (a)–(e) | PROTOCOL §10.2; ENGINE_CONTRACT §8 |
| R2-13 gates | MINOR | **Accepted.** Time intervals for G1; G2 never refuses before max(L, arming index); G1d added | ENGINE_CONTRACT §6 |
| R2-14 shadow semantics | NOTE/MINOR | **Accepted.** Stated; idle minutes after a deep exit with a preempted virtual trade open are measured | ENGINE_CONTRACT §5.10; PROTOCOL §10.7 |
| R2-15 identities | MINOR | **Accepted.** | ENGINE_CONTRACT §7 |
| R2-16 missing topics | MINOR | **Accepted.** | ENGINE_CONTRACT §1 |
| R2-17 fixtures and parity | MAJOR | **Accepted.** Full fixture list; parity list including branch quotas, P0 parity for B5/B4/B1 at four costs, P2L parity, post-seal fast-vs-reference on verdict accounts, metamorphic tests; the reference is written by a separate agent from the contract alone | ENGINE_CONTRACT §10; PROTOCOL §13 |
