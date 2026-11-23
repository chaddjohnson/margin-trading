# GIVEBACK_REPORT — Diagnostic B: profit giveback versus capital erosion in the P0 and P3 selections

This is a post hoc, report-only supplement built from bounded CPU replays (purpose `diagnostic`). It is never official
evidence, never a gate and never a ranking input. Stage B's sealed label and its recommendation not to adopt P3 stand
unchanged.
- **Source tables:** `results/analysis/TABLES.md` §B1–§B8 and §A8–§A9.
- **Records:** `results/giveback/giveback-C2x.json`, `paired-C2x.json`, `parity-C2x.json`, `subjects-C2x.csv` and
  `pairs-C2x.csv` (schemas in `DATA_SCHEMAS.md`).

**The question.** A trade that gives back substantial unrealized profit while staying profitable is not the same
capital-loss event as a trade that loses its invested principal. How much of the extra drawdown of P3's selected
phenotypes is which?

## 1. Definitions (as implemented)

**Setting.** One funded slot holds a fixed C0 = $100,000. M(t) is the marked net and R(t) the banked (realized) net; a
partial sale banks part of a lot. M^L(t) is the liquidation net: M minus the sale cost of the open shares. The path is
rebuilt from the funded-lot ledger: every regular-session minute close while a lot is held, every session close, and
every final exit (`src/vg-l0-risk-metrics/metrics.ts portfolioPath`). It reconciles with the engine within the
repository's 1e-6 relative rule; the largest observed gap is $5.8 × 10⁻¹¹ (AMENDMENTS D3).

| Term | Level | Definition (implementation) | Gated by |
|---|---|---|---|
| **Conventional marked DD** | portfolio | The engine's strict maximum minute drawdown of M from a running peak that starts at 0 (`result.dd.max`). A new peak needs a strictly higher value, and the trough is where the maximum is first reached. Percentages are of C0, never of peak equity | P0 ≤ $35,000; P3 ≤ $40,000 |
| **Liquidation-basis DD** (DD^L) | portfolio | The same tracker on M^L | report-only |
| **Banked-capital DD** (BD) | portfolio, whole path | max_t [H_R(t) − M(t)], with H_R(t) = max(0, max_{u≤t} R(u)) (`bankedDrawdown`). It counts realized erosion and open losses below what had been banked, and never a decline of profit that was never banked. It has a marked and a liquidation basis | P3: liquidation basis ≤ $30,000 |
| **U, unbanked-profit giveback** | portfolio, one window | The D3 account partition (`src/risk-envelope/diagnostics.ts componentDrawdown`) of the conventional maximum-DD window [t_p, t_t], with Mp = M(t_p), Mt = M(t_t) and banked high H = max(0, max_{u≤t_t} R(u)). U = max(0, Mp − max(H, Mt)): open profit above the best banked level, given back | — |
| **E, banked-profit erosion** | portfolio, one window | E = max(0, min(Mp, H) − max(0, Mt)): the part of the decline between the banked high and the starting capital | — |
| **F, starting-capital loss** | portfolio, one window | F = max(0, min(Mp, 0) − Mt): the part of the decline below the starting capital, with equity below C0. U + E + F = DD exactly | — |
| **Giveback-dominated** | portfolio, one window | U ≥ ½ DD (the existing design's flag, `diag-core diagnose`) | — |
| **Lot split** of the same window | lots | DD = Σ_lots [π_i(t_p) − π_i(t_t)]. Each lot's term splits into giveback above its own break-even and deepening below its own funded principal; a lot that gained in the window is a negative, offsetting term (`attributeDrawdown`). It is **never** added to or subtracted from U / E / F | — |
| **Trade principal loss** (PL) | **trade** | A funded lot's deepest P&L below zero, intratrade and at its exit, after the 5 bps per-side costs and the 11 % interest, against that lot's $100,000 funded principal (`tradeRisk`). The envelope keeps the maximum over the lots | P3: liquidation basis ≤ $25,000 |
| **Trade giveback** | **trade** | The largest decline of a lot's positive P&L from its running maximum (`maxGivebackAboveBreakeven`), with its peak profit and its final net | — |
| **Zero-evaluation bound** | portfolio, one window | U ≥ max(0, DD − BD_marked), because E + F ≤ H − Mt ≤ BD_marked (PROTOCOL §3.4). It holds to two cents on all 199 replays | — |

**Usage rule.** "Principal loss" is always the **trade** metric. "Starting-capital loss" (F) and "banked-capital DD" are
**portfolio** metrics: F is a component of one window, and BD is a whole-path maximum.
- A lot can sit $20k below its own principal while the account stays above C0, because earlier profit is banked.
- That loss appears as E (banked erosion) and as PL. It does not appear as F.

**Subjects and coverage.**
- **Subjects (per cutoff):** the representative of every lane of both arms (64), which include both arms' pooled P0 /
  RA1-original / RA1-adapted primaries, plus New L0 and N/original. That is 67 / 66 / 66 subjects on the training
  doors D19 / D21 / D24, 199 in total.
- **Exact partition:** centres only, not neighbourhood draws.
- **Neighbourhood level:** covered by the zero-evaluation bound over the sealed confirmation draws (§5). The stopped
  first C19 attempt also replayed C19 once (AMENDMENTS D3), so the CPU engine-run count is disclosed in
  `VERIFICATION.md`.

## 2. Parity: blocking, passed

| | C19 | C21 | C24 |
|---|---:|---:|---:|
| Subjects | 67 | 66 | 66 |
| To the cent: net, marked DD, BD marked / liq., PL marked / liq. vs the sealed GPU qualification evidence (`giveback.ts`'s check) | 67 / 67 | 66 / 66 | 66 / 66 |
| Bit for bit: the canonical CPU record + its CPU envelope vs the archived official GPU centre record | 67 / 67 | 66 / 66 | 66 / 66 |
| Ledger path DD vs engine DD (≤ 1e-6 relative, identical instants): exactly equal / max gap | 49 / $1.5e-11 | 54 / $1.5e-11 | 60 / $5.8e-11 |

**A cross-check against the established instrument.** New L0 on D24 decomposes as DD $19,460 = U $9,124 + E $10,336 +
F $0. That is exactly the illustration in the pilot's DIAGNOSTICS_SPEC D3, which was computed by the same definitions.

## 3. Arm-level decomposition of the selections' maximum drawdowns (TABLES §B3)

Each arm's 32 lane representatives: shares of the summed conventional DD.

| Cutoff | Arm | Mean DD | U (giveback) | E (banked erosion) | F (capital loss) | Giveback-dominated (Wilson 95 %) | F > 0 |
|---|---|---:|---:|---:|---:|---:|---:|
| C19 | CTRL (P0) | $21,020 | 93.0 % | 7.0 % | 0.0 % | 32 / 32 (89–100 %) | 0 |
| C19 | EXP-30 (P3) | $22,888 | 93.0 % | 7.0 % | 0.0 % | 32 / 32 (89–100 %) | 0 |
| C21 | CTRL | $21,988 | 90.0 % | 10.0 % | 0.0 % | 31 / 32 (84–99 %) | 0 |
| C21 | EXP-30 | $23,577 | 89.2 % | 10.8 % | 0.0 % | 30 / 32 (80–98 %) | 0 |
| C24 | CTRL | $21,551 | 58.7 % | 39.5 % | 1.8 % | 15 / 32 (31–64 %) | 1 |
| C24 | EXP-30 | $24,514 | 60.2 % | 39.8 % | 0.0 % | 21 / 32 (48–80 %) | 0 |

- **Both arms' selections have giveback-type drawdowns.** At C19 and C21, about 90 % of the conventional maximum DD of
  either arm is unbanked giveback of open profit. At C24, whose window includes 2022, it is about 60 %, and banked
  erosion makes up most of the rest (about 40 %).
- **Starting-capital loss is essentially absent.** No maximum-DD window took any EXP-30 representative below C0. One
  CTRL representative at C24 went $12,626 below C0.
- **This is a property of the strategy family, not of P3.** The two arms have almost identical shares.

## 4. The incremental marked drawdown of P3's selections (paired, 32 pairs per cutoff; TABLES §B2, §B4)

EXP-30 minus CTRL, same (cell, replicate). The 80 % intervals come from the stratified paired bootstrap (Stage B's
frozen `summarize`, B = 100,000).

| | C19 | C21 | C24 |
|---|---:|---:|---:|
| **Mean ΔDD** (centre, conventional) | **+$1,868** (+510 … +3,199) | **+$1,589** (+105 … +3,074) | **+$2,963** (+1,797 … +4,150) |
| = mean ΔU, unbanked giveback | +$1,717 (+44 … +3,384) | +$1,239 (−335 … +2,792) | +$2,125 (+424 … +3,812) |
| + mean ΔE, banked erosion | +$151 (−632 … +939) | +$350 (−517 … +1,202) | +$1,232 (−857 … +3,330) |
| + mean ΔF, starting-capital loss | $0 | $0 | −$395 (−789 … 0) |
| ΔU as a share of ΔDD | 92 % | 78 % | 72 % |
| Δ U-share of DD (pp) | +0.1 | −0.2 | +1.4 (−7.0 … +9.8) |
| Δ banked DD, liq. (whole path) | −$184 | +$118 | +$592 (−597 … +1,795) |
| Δ max trade principal loss, liq. | −$146 | +$294 | +$741 (−95 … +1,593) |
| Δ max trade giveback above break-even | +$1,720 | +$974 | +$2,024 (+1,015 … +3,052) |
| Δ net (training, the primary statistic's quantity) | −$750 | +$10,729 | +$16,387 |

**How to read it.** The identity ΔDD = ΔU + ΔE + ΔF holds for the **means of arm-level magnitudes** (residual ≤ $0.003,
from cent rounding). The two arms' maximum drawdowns are **different episodes**: different dates, lots and markets. The
rows describe how each arm's own worst episode is composed, not one shared episode.
- **The extra centre drawdown of P3's selections is mostly unbanked profit giveback:** 92 %, 78 % and 72 % of the mean
  increase.
- **Banked-profit erosion rose a little,** and is uncertain: every interval includes 0. At C24 it accounts for about 40 %
  of the increase, with a wide interval.
- **There is no increase in starting-capital loss.**
- **Trade principal loss and banked-capital DD** at the centre are statistically unchanged, as Stage B §7 found.

### 4a. The EXP-30 representatives that P0 would reject (Stage B's sealed verdicts; TABLES §B5)

These are the pairs where P3's extra allowance actually changed the selection. Stage B §5 found that each was rejected
by P0 on its **confirmation p90** DD in ($35k, $40k], not on its centre.

| Cutoff | Pairs | EXP-30 mean centre DD (U / E / F share) | Paired CTRL mean DD (U / E / F) | Mean ΔDD | = ΔU / ΔE / ΔF | Mean Δnet |
|---|---:|---|---|---:|---|---:|
| C19 | 2 | $24,187 (91 / 9 / 0 %) | $18,755 (100 / 0 / 0 %) | +$5,431 | +$3,188 / +$2,244 / $0 | +$1,644 |
| C21 | 11 | $25,045 (85 / 15 / 0 %) | $23,607 (92 / 8 / 0 %) | +$1,439 | **−$356 / +$1,794** / $0 | +$1,249 |
| C24 | 12 | $26,476 (63 / 37 / 0 %) | $21,260 (60 / 40 / 0 %) | +$5,216 | **+$3,961 / +$1,255** / $0 | +$19,888 |

- **C24.** The P0-rejected selections' extra centre DD is mostly giveback: +$4.0k of +$5.2k.
- **C21.** The extra centre DD of those 11 pairs is banked-profit **erosion** (+$1.8k), with slightly *less* giveback. Their
  mean training-net gain over the paired CTRL lane is only +$1.2k. At C21, by contrast, the other 21 pairs carry most of
  the training-profit advantage (+$15.7k), with mostly giveback (+$2.1k ΔU, −$0.4k ΔE).
- **These subsets are small** (2 / 11 / 12 pairs). Read them descriptively.

## 5. Neighbourhood drawdown: where P3's allowance acted (zero evaluations; TABLES §A8, §A9)

P3's selections differ from P0's mainly in the confirmation-p90 DD, the quantity P0 caps at $35k. Exact D3 was not
computed for the 384 draws per representative (73,728 draws per cutoff and arm pair; PROTOCOL §4.4 item 7). The bound
U ≥ DD − BD_marked and the archived envelopes answer part of the question:

| Paired representatives (32 pairs), mean Δ (80 % interval) | C19 | C21 | C24 |
|---|---:|---:|---:|
| Confirmation p90 DD | +$2,186 (+612 … +3,738) | +$4,562 (+3,446 … +5,684) | +$3,568 (+2,446 … +4,700) |
| p90 of the giveback bound | +$2,397 (+530 … +4,255) | +$2,341 (+1,037 … +3,643) | +$2,678 (+1,505 … +3,856) |
| p90 banked-capital DD (marked) | +$531 (−1,456 … +2,535) | **+$2,325 (+673 … +3,925)** | +$1,076 (−126 … +2,303) |
| p90 trade principal loss (liq.) | −$371 (−1,630 … +912) | **+$3,204 (+1,745 … +4,640)** | +$957 (−168 … +2,109) |
| Draws > $35k per representative | +6.9 | +25.3 | +38.1 |

| Draws > $35k DD (all 12,288 per arm) | C19 CTRL / EXP-30 | C21 CTRL / EXP-30 | C24 CTRL / EXP-30 |
|---|---:|---:|---:|
| Count | 213 / 434 | 276 / 1,085 | 403 / 1,621 |
| Provably giveback-dominated (bound ≥ ½ DD) | 20 % / 32 % | 17 % / 32 % | 7 % / 10 % |
| Mean bound share | 26 % / 36 % | 36 % / 47 % | 28 % / 37 % |
| Mean BD_marked (upper bound on E + F) | $30,579 / $29,137 | $25,484 / $20,350 | $28,255 / $24,393 |

Quantiles do not add up, and the bound is only a lower bound, so this level supports weaker statements.
- **C19 and C24.** The p90 neighbourhood DD increase is matched by an increase in the giveback bound of similar size,
  while p90 BD and p90 PL rise little, with intervals that include 0. That is consistent with mostly giveback.
- **C21.** The p90 neighbourhood DD increase (+$4.6k) came with **higher downside quantiles:** p90 BD +$2.3k and p90 trade
  PL +$3.2k. Both 80 % intervals exclude zero. That is materially worse downside exposure at the neighbourhood level,
  not giveback alone.
- **The breaching draws** (> $35k) are 2–4 × as frequent under P3.
  - They are somewhat more giveback-like than P0's breaches.
  - For only 10–32 % of them can the bound prove giveback-dominance. Their banked-capital DD averages $20k–$29k, so a
    large part of their DD may be erosion. **They are not shown to be mostly giveback.**

## 6. Winning versus losing positions (lot lens; TABLES §B6, §B6b)

Inside each representative's maximum-DD window, with sums over the 32 representatives:

| | C19 CTRL / EXP-30 | C21 CTRL / EXP-30 | C24 CTRL / EXP-30 |
|---|---:|---:|---:|
| Giveback by lots that **closed profitable** | $505k / $612k | $607k / $554k | $380k / $440k |
| Giveback by lots that closed at a loss | $0 / $0 | $0 / $19k | $26k / $44k |
| Giveback by lots still open at the door end | $121k / $69k | $24k / $97k | $0 / $0 |
| Deepening below principal by lots that closed at a loss | $23k / $20k | $40k / $29k | $211k / $205k |

- **Most window giveback was by lots that ended profitable.**
  - They were exited by **Growth's trend exit** or by a **trailing stop**. Gapped trailing-stop fills
    (`trailing stop gap`) account for $209k (CTRL) / $136k (EXP-30) at C21 and $154k / $75k at C24.
  - That giveback is open profit lost before the existing exit fired, not a loss of invested principal.
- **Deepening below principal** is a different population: mostly **D1 lots held to their maximum hold** and closed at a
  loss.
  - C24: 57 of 58 such CTRL lots, $185k; 38 of 40 EXP-30 lots, $147k.
  - There were also initial and protective stops (some gapped).
  - P3 does not change this population. EXP-30's window principal losses are equal or lower.
- **Some giveback is unresolved.** A large share of the giveback at C19 and C21 sat in lots **still open at the training
  door's end**. Whether it would end as banked profit is unknown from training data. Stage B's intervals (sealed) are
  the only later evidence: unfavourable to P3 at C21 and C24.
- **Interpretive limits.**
  - Gaps through a stop are recorded only as the exit reason and fill.
  - Occupancy is higher under P3 at C24 (+6.5 pp, Stage B §7). That means more time exposed and fewer, longer lots
    (−5 lots), which raises the opportunity for giveback independently of any stop setting.
  - Nothing here reconstructs unrecorded execution detail.

## 7. Episode illustrations (each arm's own window, side by side, never subtracted; TABLES §B8)

- **C21 pooled P0 primaries.**
  - **CTRL** GB0.VD1/R12#1, net $231k: DD $26,389 = U $24,349 + E $2,040. The window is 2020-02-19 → 03-12; a D1·VGT lot
    held from 2018-12-26 gave back $24.3k and still closed at +$34.7k.
  - **EXP-30** GA0.VA0/R13#1, net $247k: DD $26,359, all U. The window is 2020-09-02 → 09-21; an open D1·VGT lot fell
    from +$76.6k to +$50.2k.
  - Both are almost pure giveback of a winning D1·VGT position.
- **C21, the largest paired ΔDD** (GB0.VD1 R16).
  - **CTRL:** $17,576 = U $7,307 + E $10,270, mostly small D1·GDX losses below principal in 2020–2021.
  - **EXP-30:** $33,030 = U $12,835 + **E $20,195**. The window is 2018-01-26 → 12-24. A Growth·VGT lot **entered in the
    window fell $20.2k below its own principal** (the E part), yet later **closed at +$17.5k**. It was a temporary
    principal drawdown, not a realized loss.
- **C24 pooled P0 primaries.**
  - **CTRL** GB0.VD1/R18#1: $17,744, all U, inside 2020-03-19, a D1·GDX lot.
  - **EXP-30** GA0.VA0/R5#1: $20,167 = U $6,759 + **E $13,408**, over 2018-01 → 2019-08. Several Growth·VGT lots each lost
    $1.6k–$4.1k below principal.

## 8. Benchmarks (descriptive frozen references; never selectable; TABLES §B7)

| | C19 (net / DD; U / E / F) | C21 | C24 |
|---|---|---|---|
| New L0 | $79,970 / $10,633; $10,472 / $161 / $0 | $251,373 / $17,281; $17,281 / 0 / 0 | $382,721 / $19,460; $9,124 / $10,336 / $0 |
| N/original | $80,437 / $10,691; $10,530 / $161 / $0 | $251,839 / $17,281; $17,281 / 0 / 0 | $388,031 / $19,460; $9,124 / $10,336 / $0 |

The informed benchmarks have smaller drawdowns and higher nets on every door, with the same giveback-then-erosion
pattern as the searched candidates. They were chosen with later data and are not comparable as evidence.

## 9. Answer to the primary question

- **At the selected centres, P3 mostly allows more profit giveback.** About 72–92 % of the extra conventional DD of
  P3's representatives is unbanked giveback of open profit. The rest is banked-profit erosion, small and statistically
  indistinguishable from zero. Starting-capital loss is zero.
- **Principal and banked-capital risk is unchanged at the centre.** Trade principal loss and banked-capital DD there do
  not differ measurably between the arms, as Stage B found.
- **That is not the whole answer.**
  1. The selections P0 actually rejected were rejected on **neighbourhood** DD.
     - At C21 that neighbourhood risk came with materially higher banked-capital and trade-principal-loss quantiles.
     - At C21 the P0-rejected selections' extra centre DD is banked erosion, not giveback.
  2. P3's breaching draws are 2–4 × as frequent. Only a minority are provably giveback-dominated.
  3. Giveback in lots open at the cutoff is unresolved. On Stage B's sealed next intervals, P3's selections had larger
     drawdowns and lower nets at C21 and C24.
- **The conventional drawdown of both arms' selections is mostly giveback.** About 90 % at C19 and C21 and about 60 %
  at C24 is profit given back by winning positions before Growth's trend exit or a trailing stop fired, plus D1 lots
  held to maximum hold.

## 10. Limitations

- **Coverage.** The exact D3 is computed for **centres** only: 64 representatives, pooled primaries and 2 benchmarks per
  cutoff. Every neighbourhood draw, the 128 union members per cutoff that were not representatives, and the census
  population have only the lower bound.
- **One window per subject.** D3 decomposes the **single** conventional maximum-DD window of each path; other drawdown
  episodes are not decomposed. Banked-capital DD is a whole-path maximum and may come from a different episode.
- **Training doors only** (previously inspected history), one market history, two cells. The cutoffs are nested and are
  never pooled.
- **Rounding.** `diag-core`'s row values are rounded to cents.
- **No new data.** No intraday execution detail beyond the recorded fills and exit reasons, no margin model, no taxes.
