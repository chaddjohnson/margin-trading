# Stage C tables (generated 2026-10-24T15:36:21.018Z)

## Configurations

| Key | Kind | Books |
| --- | --- | --- |
| S0 | baseline | VGT primary; XBI lowDd; XRT lowDd; KRE lowDd |
| P-add-GDX | addition | VGT primary; XBI lowDd; XRT lowDd; KRE lowDd; GDX X 27.4% Y 0.4% stop 7.1% hold 18 L 100 buffer 3.6% P 19.1% W 81 |
| S-add-GDX | addition | VGT primary; XBI lowDd; XRT lowDd; KRE lowDd; GDX X 25.8% Y 1.0% stop 5.4% hold 8 L 172 buffer 1.4% P 17.6% W 199 |
| P-add-XOP | addition | VGT primary; XBI lowDd; XRT lowDd; KRE lowDd; XOP X 21.6% Y 4.8% stop 8.9% hold 9 L 43 buffer 0.7% P 11.2% W 126 |
| S-add-XOP | addition | VGT primary; XBI lowDd; XRT lowDd; KRE lowDd; XOP X 28.5% Y 4.9% stop 5.2% hold 6 L 38 buffer 0.4% P 15.1% W 39 |
| P-comb-GDX-XOP | combination | VGT primary; XBI lowDd; XRT lowDd; KRE lowDd; GDX X 27.4% Y 0.4% stop 7.1% hold 18 L 100 buffer 3.6% P 19.1% W 81; XOP X 21.6% Y 4.8% stop 8.9% hold 9 L 43 buffer 0.7% P 11.2% W 126 |

Design notes: none. Combination: {"considered":true,"pair":["GDX","XOP"],"singleDelta5":[146293.24669512614,81267.92637384814],"overlapShare":0.1797752808988764,"delta5":194695.13883078235,"qualifies":true,"coRefinementTriggered":false}.

Substitution candidates (5 bps):

| Vector | Removed | Conflicts (refused by / displaced) | Triggered | Δ@5 substitution | Δ@5 addition | Qualifies |
| --- | --- | --- | --- | --- | --- | --- |
| P-GDX | XBI | 2 / 1 | yes | +$78,593 | +$146,293 | no |
| P-GDX | XRT | 0 / 1 | no | — | +$146,293 | — |
| P-GDX | KRE | 3 / 12 | yes | +$49,094 | +$146,293 | no |
| P-XOP | XBI | 2 / 5 | yes | +$49,374 | +$81,268 | no |
| P-XOP | XRT | 2 / 2 | yes | +$22,516 | +$81,268 | no |
| P-XOP | KRE | 5 / 3 | yes | +$41,954 | +$81,268 | no |
| P-XLE | XBI | 1 / 0 | no | — | +$67,122 | — |
| P-XLE | XRT | 6 / 1 | yes | +$12,061 | +$67,122 | no |
| P-XLE | KRE | 13 / 6 | yes | +$9,039 | +$67,122 | no |

## Fixed $100,000 pool on training (full engine)

| Config | Net @0 (Δ) | Net @2 (Δ) | Net @5 (Δ) | Net @10 (Δ) | Minute DD @5 | Net ÷ DD @5 | Lots (new) | Interest @5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S0 | $249,174 | $246,625 | $242,196 | $233,867 | $28,659 | 8.45 | 71 (0) | $37,068 |
| P-add-GDX | $396,715 (+$147,541) | $393,667 (+$147,042) | $388,489 (+$146,293) | $379,867 (+$146,000) | $26,510 | 14.65 | 82 (9) | $37,792 |
| S-add-GDX | $288,668 (+$39,494) | $285,331 (+$38,706) | $280,278 (+$38,082) | $263,570 (+$29,703) | $26,510 | 10.57 | 81 (21) | $39,901 |
| P-add-XOP | $330,981 (+$81,808) | $328,197 (+$81,572) | $323,464 (+$81,268) | $314,584 (+$80,717) | $34,816 | 9.29 | 76 (13) | $44,181 |
| S-add-XOP | $276,704 (+$27,530) | $274,064 (+$27,439) | $269,498 (+$27,302) | $260,941 (+$27,073) | $31,730 | 8.49 | 73 (3) | $38,153 |
| P-comb-GDX-XOP | $445,524 (+$196,350) | $442,293 (+$195,668) | $436,891 (+$194,695) | $427,850 (+$193,983) | $39,877 | 10.96 | 86 (21) | $45,236 |

## 20% portfolio on training (full engine)

| Config | End equity @0 (Δ) | End equity @2 (Δ) | End equity @5 (Δ) | End equity @10 (Δ) | Max % DD daily / minute @5 | Borrowing $-days @5 |
| --- | --- | --- | --- | --- | --- | --- |
| S0 | $1,700,903 | $1,692,443 | $1,677,751 | $1,650,551 | 34.65% / 37.01% | 209.8M |
| P-add-GDX | $2,307,551 (+$606,648) | $2,293,699 (+$601,256) | $2,270,264 (+$592,513) | $2,231,767 (+$581,216) | 29.67% / 31.09% | 271.2M |
| S-add-GDX | $1,831,509 (+$130,607) | $1,819,411 (+$126,969) | $1,801,246 (+$123,495) | $1,741,149 (+$90,598) | 30.41% / 32.46% | 239.6M |
| P-add-XOP | $1,936,216 (+$235,313) | $1,925,626 (+$233,183) | $1,907,671 (+$229,919) | $1,874,536 (+$223,985) | 34.65% / 37.01% | 259.3M |
| S-add-XOP | $1,797,031 (+$96,128) | $1,787,754 (+$95,311) | $1,771,732 (+$93,981) | $1,742,184 (+$91,633) | 35.04% / 37.39% | 221.4M |
| P-comb-GDX-XOP | $2,468,822 (+$767,919) | $2,453,052 (+$760,610) | $2,426,817 (+$749,065) | $2,383,524 (+$732,973) | 29.67% / 31.08% | 327.3M |

S0 ladder (5 bps): 10% → $1,370,571 at 95.3M $-days; 15% → $1,516,974 at 149.9M $-days; 20% → $1,677,751 at 209.8M $-days; 25% → $1,854,175 at 275.3M $-days.

## Training gates (PROTOCOL.md §6.1)

| Config | Δ@0/2/5/10 | Folds Δ | Δ − best regime | Portfolio Δ @5 | Matched-borrowing Δ | T1 T2 T3 T4 T5 | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P-add-GDX | +$147,541 / +$147,042 / +$146,293 / +$146,000 | +$0 / +$88,122 / +$58,171 | +$60,032 | +$592,513 (35.32%) | +$427,073 | ✓ ✓ ✓ ✓ ✓ | **nominated** |
| S-add-GDX | +$39,494 / +$38,706 / +$38,082 / +$29,703 | +$4,652 / +$45,433 / −$12,003 | −$2,555 | +$123,495 (7.36%) | +$43,326 | ✓ ✓ ✗ ✓ ✓ | comparator |
| P-add-XOP | +$81,808 / +$81,572 / +$81,268 / +$80,717 | +$10,531 / +$45,972 / +$24,765 | +$10,074 | +$229,919 (13.70%) | +$96,710 | ✓ ✓ ✓ ✓ ✓ | **nominated** |
| S-add-XOP | +$27,530 / +$27,439 / +$27,302 / +$27,073 | +$0 / +$7,112 / +$20,190 | +$9,649 | +$93,981 (5.60%) | +$62,613 | ✓ ✓ ✗ ✗ ✓ | comparator |
| P-comb-GDX-XOP | +$196,350 / +$195,668 / +$194,695 / +$193,983 | +$10,531 / +$134,094 / +$50,070 | +$108,434 | +$749,065 (44.65%) | +$432,638 (extrapolated) | ✓ ✗ ✓ ✓ ✓ | comparator |

E4 (replay = full engine on every configuration, fixed, four costs): exact.
