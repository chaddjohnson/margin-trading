### Fold fold-a (search ≤ 2020-06-30; validation → 2021-12-31)

Arm J finalists (ranked by S_A, ties within $12,500 → smaller k → key):

| Rank | Role | Members | Centre net @5 (E0) | Centre DD @5 | P50_A (E1) [90% interval] | Q25_A | DDmed_A | DD90_A | S_A | Lots | Training portfolio daily % DD | Gates failed | Labels |
|---:|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 | primary | EDV GDX KRE | $173,900 | $28,098 | $175,746 [$173,890, $177,422] | $164,036 | $20,909 | $28,098 | $160,746 | 23 | 22.52% | none | capacity-limited; capacity-unverified; brokerage-constraint pending |
| 2 | alternate 1 | EDV GDX XRT | $184,604 | $19,476 | $182,239 [$181,868, $182,657] | $178,424 | $19,476 | $19,476 | $167,239 | 13 | 23.06% | none | thin evidence; capacity-limited; capacity-unverified; brokerage-constraint pending |
| 3 | — | EDV GDX XRT | $184,258 | $18,919 | $181,059 [$180,569, $181,549] | $176,951 | $18,919 | $18,919 | $166,059 | 14 | 23.09% | none | thin evidence; capacity-limited; capacity-unverified; brokerage-constraint pending |
| 4 | alternate 2 | GDX IJH SMH | $171,334 | $19,696 | $169,202 [$168,387, $170,265] | $162,757 | $22,056 | $25,283 | $154,202 | 25 | 25.95% | none | — |

Arm Q finalists (ranked by centre net − λk, ties by centre DD → key):

| Rank | Role | Members | Centre net @5 (E0) | Centre DD @5 | P50_A (E1) [90% interval] | Q25_A | DDmed_A | DD90_A | S_A | Lots | Training portfolio daily % DD | Gates failed | Labels |
|---:|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 | primary | EWZ GDX | $201,814 | $23,608 | $137,694 [$135,376, $143,147] | $77,584 | $23,360 | $48,715 | $125,836 | 19 | 26.00% | none | — |
| 2 | alternate 1 | GDX XHB | $180,439 | $17,744 | $141,572 [$139,504, $144,598] | $84,495 | $18,306 | $48,222 | $129,961 | 18 | 26.00% | none | capacity-limited; capacity-unverified |
| 3 | alternate 2 | GDX XLI | $177,505 | $17,744 | $62,613 [$55,792, $72,732] | $40,815 | $37,342 | $48,124 | $48,709 | 17 | 25.33% | none | capacity-limited |
| 4 | — | GDX IWN | $171,173 | $19,772 | $125,783 [$122,711, $127,855] | $69,807 | $20,591 | $48,753 | $113,907 | 17 | 26.00% | none | — |

Validation (PICKS.json body 38a220964cf0 frozen 2026-10-25T19:31:34.847Z; validation.json body d350ea4d5024; 49 windowed-drawdown self-checks all equal). Fixed pool, one continuous run; V = mark at the validation end − mark at the search end:

| | Members | Search-end mark | V @0 | V @2 | V @5 | V @10 | Percentile among eligible controls (@5) | Validation minute DD | Lots in validation | Isolated flat-start V @5 | Portfolio validation return (symmetric) | Portfolio max daily % DD to validation end |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| J primary | EDV GDX KRE | $173,900 | $5,903 | $5,217 | **$4,189** | $4,672 | 0.400 | $27,959 | 17 | $3,090 | 65.4% | 22.52% |
| J alternate 1 | EDV GDX XRT | $184,604 | $120,132 | $119,780 | **$120,241** | $119,356 | 1.000 | $78,831 | 7 | −$4,732 | 82.0% | 23.06% |
| J alternate 2 | GDX IJH SMH | $171,334 | −$22,113 | −$22,869 | **−$24,004** | −$25,893 | 0.025 | $43,523 | 19 | −$25,005 | 56.1% | 25.95% |
| Q primary | EWZ GDX | $201,814 | −$28,643 | −$29,315 | **−$30,323** | −$32,197 | 0.025 | $49,172 | 17 | −$33,602 | 54.7% | 26.00% |
| Q alternate 1 | GDX XHB | $180,439 | $47,432 | $47,088 | **$46,573** | $45,714 | 0.950 | $36,166 | 8 | −$10,300 | 78.0% | 26.00% |
| Q alternate 2 | GDX XLI | $177,505 | $6,176 | $5,610 | **$4,557** | $3,141 | 0.400 | $38,289 | 14 | −$10,300 | 65.3% | 25.33% |
| B1 | VGT | $80,585 | $32,938 | $32,815 | **$32,629** | $32,320 | 0.850 | $14,894 | 2 | $0 | 71.8% | 32.78% |
| B4 | KRE VGT XBI XRT | $67,278 | $63,434 | $62,918 | **$62,144** | $60,856 | 1.000 | $17,702 | 12 | $63,832 | 82.0% | 34.65% |
| B5 | GDX KRE VGT XBI XRT | $171,036 | $48,563 | $47,741 | **$46,508** | $44,455 | 0.950 | $16,557 | 20 | $63,832 | 79.8% | 29.67% |

Eligible pilot controls of this fold (centre DD@5 ≤ $35k and ≥ 4 funded lots in the search window): 40; V @5 quantiles ctl_0.25 = $0, ctl_0.50 = $8,777, ctl_0.75 = $23,936.

Validation-window N1 neighbourhoods of the picks (n = 64, label `validation`, descriptive):

| Pick | V @5 (centre) | P50 | Q25 | P10 | MAD | shareAbove | DDmed | DD90 | feasShare |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| J primary | $4,189 | $2,295 | −$3,303 | −$10,758 | $4,539 | 0.41 | $28,650 | $35,166 | 0.89 |
| J alternate 1 | $120,241 | $123,145 | $116,959 | $113,528 | $5,398 | 0.59 | $79,333 | $85,510 | 0.00 |
| J alternate 2 | −$24,004 | −$24,427 | −$29,056 | −$32,233 | $5,736 | 0.48 | $44,395 | $49,468 | 0.13 |
| Q primary | −$30,323 | −$21,738 | −$27,020 | −$31,342 | $6,526 | 0.84 | $48,856 | $57,753 | 0.00 |
| Q alternate 1 | $46,573 | $41,702 | $35,364 | $30,323 | $6,227 | 0.36 | $36,345 | $48,708 | 0.34 |
| Q alternate 2 | $4,557 | −$2,585 | −$5,941 | −$7,720 | $3,908 | 0.22 | $37,342 | $48,693 | 0.31 |

### Fold fold-b (search ≤ 2021-12-31; validation → 2023-12-29)

Arm J finalists (ranked by S_A, ties within $12,500 → smaller k → key):

| Rank | Role | Members | Centre net @5 (E0) | Centre DD @5 | P50_A (E1) [90% interval] | Q25_A | DDmed_A | DD90_A | S_A | Lots | Training portfolio daily % DD | Gates failed | Labels |
|---:|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| — | — | GDX IBB XME XRT | $271,526 | $18,740 | $263,243 [$261,599, $264,655] | $256,754 | $18,448 | $37,788 | $243,243 | 40 | 27.00% | G3 (40 lots in 5 years; marginals GDX 86,230, IBB 101,102, XME 42,214, XRT -1,897) | thin evidence; capacity-unverified |

Arm Q finalists (ranked by centre net − λk, ties by centre DD → key):

| Rank | Role | Members | Centre net @5 (E0) | Centre DD @5 | P50_A (E1) [90% interval] | Q25_A | DDmed_A | DD90_A | S_A | Lots | Training portfolio daily % DD | Gates failed | Labels |
|---:|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 | primary | GDX VGT XHB | $241,844 | $17,281 | $200,203 [$198,394, $202,131] | $193,153 | $17,281 | $17,281 | $185,203 | 24 | 26.86% | none | thin evidence; capacity-unverified; brokerage-constraint pending |
| 2 | alternate 1 | EWZ GDX XBI XLK | $241,802 | $29,898 | −$27,345 [−$37,101, −$14,058] | −$54,948 | $88,556 | $111,442 | −$134,122 | 20 | 25.97% | none | thin evidence |
| 3 | — | GDX XBI XLK | $225,766 | $26,838 | $98,755 [$96,380, $102,082] | $78,205 | $49,086 | $58,681 | $62,828 | 16 | 25.52% | none | thin evidence |
| — | — | GDX USMV VGT XLK | $240,598 | $26,838 | $52,902 [$46,440, $59,979] | $26,934 | $49,085 | $61,252 | $10,691 | 16 | 27.35% | G3 (GDX 180,782, USMV -5,000, VGT 23,277, XLK 137,404) | thin evidence; capacity-unverified; brokerage-constraint pending |

Validation (PICKS.json body 6581e498a51b frozen 2026-10-25T20:00:58.609Z; validation.json body a6c3e24f98b8; 47 windowed-drawdown self-checks all equal). Fixed pool, one continuous run; V = mark at the validation end − mark at the search end:

| | Members | Search-end mark | V @0 | V @2 | V @5 | V @10 | Percentile among eligible controls (@5) | Validation minute DD | Lots in validation | Isolated flat-start V @5 | Portfolio validation return (symmetric) | Portfolio max daily % DD to validation end |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Q primary | GDX VGT XHB | $241,844 | −$35,585 | −$37,047 | **−$39,158** | −$35,670 | 0.000 | $68,783 | 36 | −$6,746 | −8.6% | 41.67% |
| Q alternate 1 | EWZ GDX XBI XLK | $241,802 | −$7,367 | −$7,886 | **−$13,506** | −$16,765 | 0.238 | $72,067 | 32 | $48,543 | −0.9% | 37.40% |
| B1 | VGT | $113,214 | $23,074 | $22,702 | **$22,145** | $21,217 | 1.000 | $17,421 | 9 | $22,145 | 3.0% | 32.78% |
| B4 | KRE VGT XBI XRT | $129,422 | $117,449 | $115,822 | **$112,774** | $106,745 | 1.000 | $22,327 | 49 | $105,259 | 22.1% | 34.65% |
| B5 | GDX KRE VGT XBI XRT | $217,544 | $174,980 | $173,609 | **$170,945** | $166,509 | 1.000 | $17,269 | 42 | $163,430 | 36.1% | 29.67% |

Eligible pilot controls of this fold (centre DD@5 ≤ $35k and ≥ 4 funded lots in the search window): 42; V @5 quantiles ctl_0.25 = −$11,622, ctl_0.50 = −$3,864, ctl_0.75 = $4,565.

Validation-window N1 neighbourhoods of the picks (n = 64, label `validation`, descriptive):

| Pick | V @5 (centre) | P50 | Q25 | P10 | MAD | shareAbove | DDmed | DD90 | feasShare |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Q primary | −$39,158 | −$32,548 | −$38,373 | −$45,748 | $7,074 | 0.77 | $63,634 | $73,415 | 0.00 |
| Q alternate 1 | −$13,506 | $16,919 | −$5,255 | −$14,395 | $26,027 | 0.86 | $113,011 | $148,526 | 0.00 |
