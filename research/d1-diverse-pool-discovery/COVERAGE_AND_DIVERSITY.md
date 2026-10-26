# Coverage and diversity (PROTOCOL.md §9–§11)

**Who this is for:** the user and reviewers checking whether the search actually explored the 61-symbol universe and
kept genuinely different alternatives alive. Coverage is a property of the search, not evidence of forward skill.

Sources:
- the sealed per-arm `results/rounds/<window>/<arm>/search.json` and the archive logs they hash;
- `results/tables/coverage-summary.json`, from `scripts/coverage_summary.py`, which re-verifies every archive log's
  hash before reading it;
- `results/tables/coverage.md` and `coverage-by-symbol.md` (`npm run diverse-d1 -- tables`).

## 1. Verdict

**Every coverage contract was met in every arm of every round: 10 arms, 0 failures.** Each of the 61 eligible symbols
was searched at least 1,026 times in every final arm, against a floor of 600. The October 25 study reached a minimum
of 191, left 29 and 25 symbols under the same floor, and reached 116 in a fold. Families were formed per arm without
chaining. The diversity question that remains is in §4: different families do not always mean different memberships.

## 2. Required versus actual, per symbol (minimum over the 61 symbols)

| Contract (per symbol) | Required: final / fold J,T / fold Q | final J-u | final T-u | final J-s | final T-s | fold J/T (min over 4 arms) | fold Q (min over 2) |
|---|---|---:|---:|---:|---:|---:|---:|
| Configurations containing the symbol | 600 / 450 / 440 | 1,049 | 1,056 | 1,047 | 1,026 | 733 | 534 |
| Distinct vectors on the symbol | 225 / 200 / 200 | 695 | 677 | 690 | 657 | 553 | 472 |
| Band A1 (1 book) | 8 | 15 | 22 | 21 | 18 | 13 | 9 |
| Band A5 (12–16 books) / A6 (17–24) | 20 / 8 | 20 / 8 | 20 / 8 | 20 / 8 | 20 / 8 | 20 / 8 | 20 / 8 |
| Distinct co-members | 55 | 60 | 60 | 60 | 60 | 60 | 60 |
| Configurations with each category: sector-industry, factor-size, non-US, rates-credit, real-assets | 30 each | ≥ 256 | ≥ 209 | ≥ 278 | ≥ 241 | ≥ 134 | ≥ 140 |

Bands A5 and A6 sit exactly at their floors by construction. The stage-A schedule places every symbol in those
large-pool bands the stated number of times, and evolution then concentrates on small pools.

**Arm-level protected examples** (final round; floors 500 / 100 / 500 / 100 / 500):

| Arm | B5-free | with VGT | without VGT | with GDX | without GDX |
|---|---:|---:|---:|---:|---:|
| J-u | 26,557 | 3,415 | 43,617 | 14,959 | 32,073 |
| T-u | 28,770 | 8,302 | 38,730 | 5,763 | 41,269 |
| J-s | 24,684 | 9,058 | 37,974 | 17,454 | 29,578 |
| T-s | 25,809 | 17,361 | 29,671 | 14,936 | 32,096 |

## 3. How the budget was spent: exploration versus selective search

| Stage | What it is | Per final arm | Share | Per fold J/T arm | Per fold Q arm |
|---|---|---:|---:|---:|---:|
| A — quota schedule | outcome-free: every symbol 396+ appearances across all size bands, distinct vectors | 6,632 | 14.1% | 6,632 (24.7%) | 6,632 (52.3%) |
| B — anchored islands | one island per symbol, equal budget always spent (selective within the symbol) | 24,400 (61 × 400) | 51.9% | 12,200 | 3,660 |
| C — free islands | 8 islands with migration; selective over the whole universe | 16,000 (8 × 2,000) | 34.0% | 8,000 | 2,400 |
| Total fresh configurations | | 47,032 | | 26,832 | 12,692 |

About two thirds of each final arm's budget (stages A and B) is reserved by symbol, so no symbol can be starved. Only
the last third searches freely. Repeated proposals are cache hits and are not counted: 794–807 per final arm.

**Where the free search concentrated** (the most-searched symbol per final arm):
- J-u: GDX in 14,959 configurations.
- J-s: GDX in 17,454.
- T-u: EWW in 9,405.
- T-s: VGT in 17,361.

The least-searched were XOP or XME, at 1,026 (XME, T-s) to 1,056 (XOP, T-u). The October 25 final arms ranged 191 → 12,760.

**Pool sizes searched** (final round; configurations by size band; A1 / A2 / A3 / A4 / A5 / A6):

| Arm | A1 | A2 | A3 | A4 | A5 | A6 |
|---|---:|---:|---:|---:|---:|---:|
| J-u | 6,282 | 20,624 | 18,264 | 1,732 | 103 | 27 |
| T-u | 6,778 | 21,426 | 16,669 | 2,025 | 107 | 27 |
| J-s | 6,025 | 18,739 | 21,002 | 1,135 | 104 | 27 |
| T-s | 6,451 | 19,537 | 19,655 | 1,259 | 103 | 27 |

**Distinct memberships** (symbol sets, ignoring parameters) evaluated per final arm: J-u 16,447, T-u 16,101,
J-s 14,843, T-s 14,233.

## 4. Families and shortlists: are the alternatives genuinely different?

**Final round** (sealed `results/rounds/final/select/<arm>/promotion.json` and `assessment.json`; 8 slots per arm:
Q1–Q3 by score, then compact, medium, broad, incumbent-free and far):

| Arm | Credible | Families | Largest families (share of credible) | Slots filled | Distinct promoted memberships | Finalists | Distinct finalist memberships | Passing all final gates |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| J-u | 20,467 | 5,276 | 506, 284, 275 (2.5%) | 8 / 8 | 6 | 8 | 5 | 0 |
| T-u | 21,030 | 4,979 | 679, 591, 464 (3.2%) | 7 / 8 ("far" failed after 3 attempts) | 5 | 7 | 5 | 0 |
| J-s | 21,028 | 4,151 | 1,728, 787, 564 (8.2%) | 8 / 8 | 4 | 8 | 4 | 5 |
| T-s | 23,375 | 4,353 | 2,629, 778, 542 (11.2%) | 8 / 8 | 6 | 7 (f6 failed F-P after pruning) | 5 | 1 |

What this shows:

1. **The unseeded arms were protected.** Each formed thousands of families from its own archive and promoted and
   assessed 7–8 of them, although the seeded arms' scores were higher. In the October 25 study the pooled top 300
   contained no unseeded candidate at all.
2. **The unseeded searches converged on a new region, not on B5.**
   - J-u's shortlist is dominated by EWW FXI GDX XME (alone or with SMH and KIE): 5 of 8 promoted families. A sixth
     is EWW FXI SMH XLK XME.
   - T-u's mixes EWW FXI KRE MTUM SLV XME and EWW GDX ILF VGT XBI.
   - A few families stand apart: FXI GDX XHB, EDV GDX SLV XLK, DBC GDX SLV SMH XBI, EWW SLV XME.
3. **The seeded searches converged back on B5's neighbourhood.**
   - Five of J-s's eight promoted families are GDX KRE XBI XRT, which is B5 without VGT, with different parameters.
   - T-s centres on GDX KRE VGT XBI XRT, which is B5 itself with re-tuned parameters.
   - Only the incumbent-free and far slots (FXI ILF IWN SLV; EWW FXI IWN SLV TIP XLY; GDX IWF IWN; EWW FXI GDX IEMG
     KRE VGT) brought different memberships. They come from the quota slots, not the score.
4. **Families are not the same as memberships.** Promoted families had 4–6 distinct memberships per arm, and finalists
   4–5 per arm. Within each arm, at least one pair of finalists has identical membership (Jaccard distance 0) but
   different parameters and funded trades. The family rule (membership *and* behaviour) keeps them apart, so they
   count as alternatives under the protocol. They are not alternatives a portfolio manager would call different.
5. **No collapse.** The largest family held 2.5–11.2% of an arm's credible set; the October 25 final had 100% (295 of
   295).

Fold rounds, from the sealed promotion and assessment records:

| Round / arm | Credible | Families | Largest families | Promoted | Distinct promoted memberships | Assessed finalists | Distinct finalist memberships |
|---|---:|---:|---|---:|---:|---:|---:|
| fold-a J-u | 8,574 | 2,651 | 276, 180, 155 | 6 | 4 | 6 | 5 |
| fold-a T-u | 6,182 | 1,911 | 288, 125, 73 | 6 | 5 | 6 | 5 |
| fold-a Q-u | 1,719 | 1,076 | 22, 14, 10 | 4 | 4 | 4 | 4 |
| fold-b J-u | 7,070 | 2,836 | 136, 98, 84 | 6 | 4 | 6 | 4 |
| fold-b T-u | 3,991 | 1,797 | 74, 70, 33 | 6 | 4 | 6 | 5 |
| fold-b Q-u | 1,701 | 1,135 | 15, 14, 13 | 4 | 4 | 4 | 3 |

- **No chaining.** Families are cliques (leader-ordered complete linkage). The largest fold family held 288 of
  6,182 credible configurations; the October 25 study chained 298 of 298 into one.
- **But distinct families can share a membership.** A family is defined by closeness of membership *and* funded
  behaviour, so two families with the same symbols but different parameters and trades are different families.
  - In fold-a J-u, the six promoted families had four distinct memberships.
  - In fold-b J-u, three of six finalists were GDX + SMH variants.
  - The pre-final review flagged this (observation 9). It is reported here as effective membership diversity, and it
    is why §4 counts distinct memberships, not only families.
