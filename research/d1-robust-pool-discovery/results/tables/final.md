G-WF FAILED (GWF.json c4ed4e55184c); passing finalists 1; nominees none (G-WF failed; the G1–G8 ranking alone would have nominated: primary GDX KRE XBI XLE). Evaluations: unseeded 24,000, seeded 24,000; 1,887 s.

Promotion (pooled top 300 by S at n = 12, re-evaluated at n = 96): 295 feasible, 5 infeasible; 1 families (sizes 295); refined: GDX KRE XBI XLE. Notes: compact (≤ 3 books): no feasible family qualifies; far from B5 (Jaccard ≥ 0.75): no feasible family qualifies; unseeded among the top three: no feasible unseeded family.

Refinement refine-f1: GDX KRE XBI XLE → GDX KRE XBI XLE; 417 unique evaluations over 2 cycle(s); accepted: coordinate: KRE trailingBuyPercentage +2; S $268,550 → $273,953 (n = 48).

| Configuration | Members | Centre net @5 (E0) | Centre DD @5 | P50_A (E1) [90% interval] | Q25_A | MAD | shareAbove | DDmed | DD90 | feasShare | S_A | P50_A @10 | A2 P50 | N2 P50 | Lots | Portfolio end equity (sym., 5 bps) | Portfolio daily % DD | Labels |
|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| pooled-f1 (seeded) | GDX KRE XBI XLE | $309,743 | $27,575 | $291,440 [$289,748, $293,496] | $277,611 | $13,164 | 0.13 | $34,799 | $41,466 | 0.53 | $271,440 | $282,569 | $182,701 | $306,540 | 76 | $1,965,346 | 29.23% | — |
| B1 | VGT | $135,359 | $19,534 | $96,352 [$91,321, $99,753] | $78,971 | $16,265 | 0.00 | $21,312 | $27,153 | 1.00 | $91,352 | $94,674 | $71,890 | $114,158 | 17 | $1,369,256 | 32.78% | inspected control vector; brokerage-constraint pending; portfolio DD in (30%, 35%] |
| B4 | KRE VGT XBI XRT | $242,196 | $28,659 | $134,121 [$128,499, $137,662] | $113,024 | $21,049 | 0.00 | $38,106 | $52,754 | 0.36 | $107,138 | $125,498 | $90,624 | $219,115 | 71 | $1,671,393 | 34.65% | inspected control vector; capacity-unverified; brokerage-constraint pending; portfolio DD in (30%, 35%] |
| B5 | GDX KRE VGT XBI XRT | $388,489 | $26,510 | $210,556 [$204,703, $217,107] | $172,189 | $36,232 | 0.00 | $36,660 | $53,870 | 0.37 | $179,462 | $203,917 | $152,801 | $362,420 | 82 | $2,262,889 | 29.67% | inspected control vector; capacity-unverified; brokerage-constraint pending |

**pooled-f1** (GDX KRE XBI XLE, seeded arm) — gates:

| Gate | Pass | Detail |
|---|---|---|
| G1 | ✓ | parity 0/0/0/0, identity true |
| G2 | ✓ | DD@5 27,575, DD@10 27,769, portfolio 29.23% |
| G3 | ✓ | 76 lots in 5 years; marginals GDX 112,597, KRE 36,775, XBI 87,117, XLE 20,000 |
| G4 | ✓ | P50@10 282,569 vs P50@5 291,440; centre 317,315/314,315/302,225 |
| G5 | ✓ | Q25 277,611; net − top2 239,380; net − best regime 226,826 |
| G6 | ✓ | B4: ΔP50 157,320 [153,878, 163,267], ΔS 164,302; B5: ΔP50 80,884 [74,391, 87,264], ΔS 91,979 |
| G7 | ✓ | end equity 1,965,346 vs B5 ladder 1,926,828 |
| G8 | ✓ | max tie-order change 9,348; boundary coordinates 2 of 32 |

Members (smoothed leave-one-out marginal on the confirm-A draws; capacity on the decision minutes):

| Member | Virtual trades | Funded lots | Regimes | Centre net | Marginal S_A(C) − S_A(C∖i) | Net without | DD without | Grade | partLot | partPortfolio | Delayed fills | N3 P50 (this member moved) |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| GDX | 22 | 13 | 6 | $115,705 | $112,597 | $211,698 | $32,273 | standard | 0.51% | 2.01% | 0.0% | $301,748 |
| KRE | 63 | 36 | 5 | $81,221 | $36,775 | $278,835 | $27,404 | standard | 0.87% | 3.43% | 0.0% | $316,056 |
| XBI | 29 | 23 | 3 | $63,436 | $87,117 | $218,240 | $48,799 | standard | 0.59% | 2.31% | 0.0% | $287,322 |
| XLE | 20 | 4 | 4 | $49,382 | $20,000 | $300,819 | $23,077 | standard | 0.22% | 0.86% | 0.0% | $308,552 |

Tie orders: reverse alphabetical $319,092; seeded order 1 $319,092; seeded order 2 $309,743 (largest change $9,348); boundary coordinates 2 of 32; N0 probes 113 (feasible 94.7%, median $309,357); 16 portfolio neighbours: median daily % DD 31.37%, max 36.40%; C0 on the finalist's drawdown dates 33.89% (C0's own maximum 33.89%); B5 ladder at matched borrowing $1,926,828.

Paired confirm-A differences (finalist − benchmark, 256 common draws): B4 ΔP50 $157,320 [$153,878, $163,267], ΔS $164,302, Spearman 0.17, variance reduction ×1.1; B5 ΔP50 $80,884 [$74,391, $87,264], ΔS $91,979, Spearman 0.19, variance reduction ×1.1.

confirm-B reporting batch (n = 256, drawn after FROZEN_SELECTION.json; reported only):

| Configuration | Kind | Centre net | P50_B [90% interval] | Q25_B [90% interval] | DDmed_B | DD90_B | S_B | P50_A | B − A | Within 2 pooled SE | ΔP50_B vs B4 [90%] | ΔP50_B vs B5 [90%] |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---|---|---|
| pooled-f1 | finalist | $309,743 | $290,689 [$288,428, $293,697] | $278,290 [$276,458, $280,556] | $34,600 | $39,949 | $270,689 | $291,440 | −$751 | yes | $160,057 [$153,754, $164,805] | $86,296 [$76,385, $94,557] |
| B1 | benchmark | $135,359 | $93,606 [$90,920, $96,130] | $78,467 [$74,204, $81,873] | $21,384 | $27,225 | $88,606 | $96,352 | −$2,746 | yes | −$37,026 [−$43,655, −$32,222] | −$110,787 [−$120,757, −$102,036] |
| B4 | benchmark | $242,196 | $130,632 [$126,513, $136,425] | $109,621 [$105,053, $114,905] | $37,527 | $52,581 | $104,315 | $134,121 | −$3,488 | yes | $0 [$0, $0] | −$73,761 [−$82,161, −$65,953] |
| B5 | benchmark | $388,489 | $204,393 [$196,135, $214,430] | $168,368 [$162,237, $175,203] | $37,098 | $54,974 | $172,308 | $210,556 | −$6,163 | yes | $73,761 [$65,862, $82,032] | $0 [$0, $0] |
| R1 | inspect-only (16-ETF training peak; never a candidate) | $467,806 | $262,061 [$252,332, $269,077] | $225,323 [$214,936, $232,183] | $35,850 | $49,112 | $239,155 | $265,286 | −$3,225 | yes | $131,429 [$121,159, $138,477] | $57,668 [$45,369, $67,026] |
| R4 | inspect-only (16-ETF training peak; never a candidate) | $371,690 | $239,683 [$237,616, $243,328] | $210,405 [$200,470, $214,812] | $36,317 | $51,826 | $214,954 | $241,843 | −$2,159 | yes | $109,051 [$103,289, $113,967] | $35,290 [$26,061, $43,313] |
