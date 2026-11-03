# Refinement tables

9916 unique refinement evaluations.

## Contenders

| Slot | Rule | Members | Books | Net@5 | Minute DD | Q |
|---|---:|---:|---:|---:|---:|---:|
| c1 | best Q | XBI XRT KRE GDX | 4 | $442,365 | $22,563 | $422,365 |
| c2 | best Q with ≥ 9 books, d ≥ 0.5 | XBI XRT GDX IWM IWN VOOG XLE XLF XLY XOP | 10 | $194,230 | $32,956 | $144,230 |
| c3 | next by Q, d ≥ 0.5 | VGT XBI KRE GDX GLD | 5 | $375,362 | $26,510 | $350,362 |
| c4 | next by Q, d ≥ 0.5 | XBI KRE GDX VOOG XLF | 5 | $350,580 | $21,716 | $325,580 |
| c5 | next by Q, d ≥ 0.5 | XBI XRT GDX GLD IWN | 5 | $343,020 | $17,281 | $318,020 |
| c6 | next by Q, d ≥ 0.5 | XBI XRT GDX TLT XLU | 5 | $337,679 | $17,647 | $312,679 |

## Refinement runs

| Slot | Cycles | New evaluations | Accepted (membership / coordinate / joint) | Multi-member moves | Members retuned | Start → result net | Stopped by |
|---|---:|---:|---:|---:|---:|---:|---:|
| c1 | 6 | 1327 | 0 / 10 / 0 | 0 | GDX XBI XRT | $442,365 → $467,806 | a full cycle accepted no move |
| c2 | 7 | 2500 | 3 / 33 / 2 | 4 | GDX IWM IWN TLT VOOG XBI XLF XOP XRT KRE XLE | $194,230 → $288,741 | budget |
| c3 | 6 | 1686 | 3 / 7 / 1 | 1 | GDX VGT XRT XLY | $375,362 → $418,267 | a full cycle accepted no move |
| c4 | 6 | 1313 | 1 / 7 / 0 | 0 | GDX XLF | $350,580 → $371,690 | a full cycle accepted no move |
| c5 | 7 | 1798 | 2 / 14 / 0 | 0 | GDX GLD IWN XLY | $343,020 → $398,276 | a full cycle accepted no move |
| c6 | 6 | 1292 | 3 / 6 / 0 | 0 | GDX XRT | $337,679 → $357,251 | a full cycle accepted no move |

## What refinement changed in the funded pool (5 bps)

| Slot | Lots before → after | Kept (net change) | Lost (net) | Gained (net) | Gained by symbol | Lost by symbol |
|---|---:|---:|---:|---:|---:|---:|
| c1 | 82 → 73 | 51 (+$0) | 31 ($89,810) | 22 ($115,251) | GDX 4, XBI 15, XRT 2, KRE 1 | XBI 16, GDX 4, KRE 10, XRT 1 |
| c2 | 50 → 50 | 21 (−$54) | 29 ($87,321) | 29 ($181,886) | XOP 4, VOOG 3, IWN 4, KRE 5, TLT 3, XBI 5, XRT 2, IWM 2, GDX 1 | XOP 6, VOOG 4, XLE 3, IWN 6, XLF 1, XBI 1, XLY 1, IWM 4, XRT 1, GDX 2 |
| c3 | 80 → 87 | 71 (+$1,352) | 9 ($62,534) | 16 ($104,088) | XLY 2, GDX 3, KRE 4, XBI 2, XRT 4, VGT 1 | GDX 3, KRE 3, VGT 3 |
| c4 | 82 → 81 | 72 (+$0) | 10 ($48,941) | 9 ($70,050) | XLF 4, GDX 4, XBI 1 | XLF 4, GDX 4, KRE 1, VOOG 1 |
| c5 | 49 → 45 | 37 (+$27,118) | 12 ($14,157) | 8 ($42,296) | IWN 2, XLY 4, GDX 2 | IWN 2, XBI 4, GLD 5, XRT 1 |
| c6 | 44 → 44 | 41 (+$8,800) | 3 (−$6,931) | 3 ($3,840) | XRT 2, VGT 1 | GDX 2, XBI 1 |

### c1 accepted moves

| Cycle | Pass | Move | Books | Net@5 | Minute DD | J |
|---|---:|---:|---:|---:|---:|---:|
| 1 | coordinate | GDX intradayLossBuffer -10 | 4 | $443,322 | $22,563 | $423,322 |
| 1 | coordinate | XBI tickWindowSize -5 | 4 | $445,302 | $22,563 | $425,302 |
| 1 | coordinate | XRT pullback -10 | 4 | $458,213 | $21,626 | $438,213 |
| 2 | coordinate | GDX intradayLossBuffer -10 | 4 | $459,107 | $21,626 | $439,107 |
| 2 | coordinate | XBI targetPercentChange -10 | 4 | $460,898 | $21,626 | $440,898 |
| 3 | coordinate | GDX intradayLossBuffer -10 | 4 | $462,001 | $21,626 | $442,001 |
| 3 | coordinate | XBI targetPercentChange -10 | 4 | $465,819 | $21,626 | $445,819 |
| 4 | coordinate | GDX intradayLossBuffer -5 | 4 | $466,505 | $21,626 | $446,505 |
| 4 | coordinate | XBI trailingBuyPercentage -1 | 4 | $467,437 | $21,626 | $447,437 |
| 5 | coordinate | GDX trailingBuyPercentage -2 | 4 | $467,806 | $21,626 | $447,806 |

### c2 accepted moves

| Cycle | Pass | Move | Books | Net@5 | Minute DD | J |
|---|---:|---:|---:|---:|---:|---:|
| 1 | membership | swap XLY→TLT | 10 | $200,419 | $32,956 | $150,419 |
| 1 | coordinate | GDX maximumHoldDays -1 | 10 | $203,530 | $32,956 | $153,530 |
| 1 | coordinate | IWM trailingBuyPercentage -1 | 10 | $207,957 | $32,956 | $157,957 |
| 1 | coordinate | IWN targetPercentChange +5 | 10 | $211,392 | $32,956 | $161,392 |
| 1 | coordinate | TLT maximumHoldDays +2 | 10 | $215,230 | $32,956 | $165,230 |
| 1 | coordinate | VOOG pullback +5 | 10 | $218,806 | $32,956 | $168,806 |
| 1 | coordinate | XBI trailingStopPercentage -5 | 10 | $220,127 | $32,956 | $170,127 |
| 1 | coordinate | XLF trailingStopPercentage -5 | 10 | $221,084 | $32,956 | $171,084 |
| 1 | coordinate | XOP pullback +10 | 10 | $223,288 | $32,956 | $173,288 |
| 1 | coordinate | XRT trailingBuyPercentage -2 | 10 | $223,956 | $32,956 | $173,956 |
| 1 | joint | joint IWN+TLT | 10 | $224,654 | $32,956 | $174,654 |
| 2 | membership | swap XLF→KRE | 10 | $234,546 | $32,956 | $184,546 |
| 2 | coordinate | IWM maximumHoldDays -2 | 10 | $239,346 | $32,956 | $189,346 |
| 2 | coordinate | IWN tickWindowSize -5 | 10 | $243,973 | $32,956 | $193,973 |
| 2 | coordinate | KRE trailingStopPercentage -10 | 10 | $254,066 | $32,956 | $204,066 |
| 2 | coordinate | TLT maximumHoldDays -2 | 10 | $255,942 | $32,956 | $205,942 |
| 2 | coordinate | VOOG trailingBuyPercentage -2 | 10 | $256,621 | $32,909 | $206,621 |
| 2 | coordinate | XBI trailingStopPercentage -10 | 10 | $266,179 | $34,068 | $216,179 |
| 2 | coordinate | XLE trailingStopPercentage -5 | 10 | $266,709 | $34,068 | $216,709 |
| 2 | coordinate | XOP pullback +10 | 10 | $267,959 | $32,909 | $217,959 |
| 2 | coordinate | XRT trailingBuyPercentage -1 | 10 | $268,087 | $32,909 | $218,087 |
| 2 | joint | joint KRE+VOOG+XBI | 10 | $269,772 | $32,909 | $219,772 |
| 3 | membership | remove XLE | 9 | $267,573 | $32,909 | $222,573 |
| 3 | coordinate | GDX targetPercentChange -10 | 9 | $271,626 | $32,909 | $226,626 |
| 3 | coordinate | IWM maximumHoldDays +2 | 9 | $272,775 | $32,909 | $227,775 |
| 3 | coordinate | IWN maximumHoldDays -1 | 9 | $273,231 | $32,909 | $228,231 |
| 3 | coordinate | KRE trailingStopPercentage -5 | 9 | $274,040 | $32,909 | $229,040 |
| 3 | coordinate | VOOG trailingBuyPercentage -2 | 9 | $275,014 | $32,887 | $230,014 |
| 3 | coordinate | XBI maximumHoldDays +1 | 9 | $278,565 | $33,210 | $233,565 |
| 3 | coordinate | XRT maximumHoldDays +1 | 9 | $280,349 | $33,210 | $235,349 |
| 4 | coordinate | IWN maximumHoldDays -1 | 9 | $281,232 | $33,210 | $236,232 |
| 4 | coordinate | TLT maximumHoldDays -2 | 9 | $284,553 | $33,210 | $239,553 |
| 4 | coordinate | VOOG trailingBuyPercentage -2 | 9 | $285,432 | $33,210 | $240,432 |
| 5 | coordinate | IWN trailingBuyPercentage -1 | 9 | $286,183 | $33,210 | $241,183 |
| 5 | coordinate | TLT intradayLossBuffer -10 | 9 | $287,445 | $33,210 | $242,445 |
| 5 | coordinate | VOOG trailingBuyPercentage -2 | 9 | $287,631 | $33,210 | $242,631 |
| 6 | coordinate | IWN trailingBuyPercentage -1 | 9 | $288,166 | $33,210 | $243,166 |
| 6 | coordinate | VOOG targetPercentChange +5 | 9 | $288,741 | $33,210 | $243,741 |

### c3 accepted moves

| Cycle | Pass | Move | Books | Net@5 | Minute DD | J |
|---|---:|---:|---:|---:|---:|---:|
| 1 | membership | remove GLD | 4 | $375,362 | $26,510 | $355,362 |
| 1 | coordinate | GDX trailingBuyPercentage -2 | 4 | $376,000 | $26,510 | $356,000 |
| 1 | coordinate | VGT trailingStopPercentage -5 | 4 | $386,357 | $26,453 | $366,357 |
| 2 | membership | add XRT | 5 | $393,474 | $26,453 | $368,474 |
| 2 | coordinate | VGT intradayLossBuffer -5 | 5 | $393,619 | $26,453 | $368,619 |
| 2 | coordinate | XRT trailingBuyPercentage +1 | 5 | $406,067 | $26,453 | $381,067 |
| 3 | membership | add XLY | 6 | $413,583 | $26,453 | $383,583 |
| 3 | coordinate | XLY trailingStopPercentage -10 | 6 | $415,648 | $26,453 | $385,648 |
| 4 | coordinate | XLY maximumHoldDays +2 | 6 | $417,442 | $26,453 | $387,442 |
| 5 | coordinate | XLY trailingStopPercentage -5 | 6 | $418,014 | $26,453 | $388,014 |
| 5 | joint | joint XLY+XRT | 6 | $418,267 | $26,453 | $388,267 |

### c4 accepted moves

| Cycle | Pass | Move | Books | Net@5 | Minute DD | J |
|---|---:|---:|---:|---:|---:|---:|
| 1 | membership | remove VOOG | 4 | $362,688 | $21,716 | $342,688 |
| 1 | coordinate | GDX intradayLossBuffer -10 | 4 | $363,644 | $21,716 | $343,644 |
| 1 | coordinate | XLF maximumHoldDays +2 | 4 | $368,256 | $21,716 | $348,256 |
| 2 | coordinate | GDX intradayLossBuffer -10 | 4 | $369,150 | $21,716 | $349,150 |
| 2 | coordinate | XLF trailingBuyPercentage -1 | 4 | $369,531 | $21,691 | $349,531 |
| 3 | coordinate | GDX intradayLossBuffer -10 | 4 | $370,634 | $21,691 | $350,634 |
| 4 | coordinate | GDX intradayLossBuffer -5 | 4 | $371,321 | $21,691 | $351,321 |
| 5 | coordinate | GDX trailingBuyPercentage -2 | 4 | $371,690 | $21,691 | $351,690 |

### c5 accepted moves

| Cycle | Pass | Move | Books | Net@5 | Minute DD | J |
|---|---:|---:|---:|---:|---:|---:|
| 1 | membership | add XLY | 6 | $350,343 | $17,281 | $320,343 |
| 1 | coordinate | GDX trailingStopPercentage -5 | 6 | $354,952 | $17,281 | $324,952 |
| 1 | coordinate | GLD trailingBuyPercentage -1 | 6 | $356,265 | $18,250 | $326,265 |
| 1 | coordinate | IWN maximumHoldDays +1 | 6 | $366,639 | $18,250 | $336,639 |
| 1 | coordinate | XLY trailingBuyPercentage -2 | 6 | $378,027 | $18,050 | $348,027 |
| 2 | membership | remove GLD | 5 | $378,027 | $18,050 | $353,027 |
| 2 | coordinate | GDX maximumHoldDays -2 | 5 | $382,272 | $17,281 | $357,272 |
| 2 | coordinate | IWN maximumHoldDays +2 | 5 | $386,814 | $17,281 | $361,814 |
| 2 | coordinate | XLY trailingBuyPercentage -1 | 5 | $387,221 | $17,281 | $362,221 |
| 3 | coordinate | GDX intradayLossBuffer -10 | 5 | $388,178 | $17,281 | $363,178 |
| 3 | coordinate | IWN tickWindowSize +10 | 5 | $392,387 | $17,281 | $367,387 |
| 3 | coordinate | XLY maximumHoldDays -1 | 5 | $393,627 | $17,281 | $368,627 |
| 4 | coordinate | GDX intradayLossBuffer -10 | 5 | $394,522 | $17,281 | $369,522 |
| 4 | coordinate | IWN trailingStopPercentage -5 | 5 | $396,487 | $17,281 | $371,487 |
| 5 | coordinate | GDX intradayLossBuffer -10 | 5 | $397,590 | $17,281 | $372,590 |
| 6 | coordinate | GDX intradayLossBuffer -5 | 5 | $398,276 | $17,281 | $373,276 |

### c6 accepted moves

| Cycle | Pass | Move | Books | Net@5 | Minute DD | J |
|---|---:|---:|---:|---:|---:|---:|
| 1 | membership | remove XLU | 4 | $337,679 | $17,647 | $317,679 |
| 1 | coordinate | GDX intradayLossBuffer -10 | 4 | $338,636 | $17,647 | $318,636 |
| 1 | coordinate | XRT targetPercentChange -10 | 4 | $342,517 | $17,647 | $322,517 |
| 2 | membership | remove TLT | 3 | $342,517 | $17,647 | $327,517 |
| 2 | coordinate | GDX intradayLossBuffer -10 | 3 | $343,412 | $17,647 | $328,412 |
| 3 | membership | add VGT | 4 | $350,302 | $21,201 | $330,302 |
| 3 | coordinate | GDX trailingStopPercentage -5 | 4 | $355,461 | $20,652 | $335,461 |
| 4 | coordinate | GDX intradayLossBuffer -10 | 4 | $356,564 | $20,652 | $336,564 |
| 5 | coordinate | GDX intradayLossBuffer -5 | 4 | $357,251 | $20,652 | $337,251 |
