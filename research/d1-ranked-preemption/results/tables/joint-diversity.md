
## fold-a R1 (body 396fcdde42dc; universe 49; budget share 1)
| arm | evaluations | feasible | distinct memberships | symbols tried | symbols in ≥ 25% of evaluations | effective symbols | median size | best feasible J_pool |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| S | 10000 | 99.5% | 1355 | 49 | GDX 96%, EWW 95%, EDV 95%, XLY 91%, XHB 88%, IGV 87%, FXI 80%, KRE 56%, IAU 45% | 10.4 | 8 | $290,659 |
| I | 10000 | 88.3% | 1743 | 49 | IGV 92%, XHB 90%, GDX 86%, XME 85%, SMH 81%, EDV 66%, XBI 66%, XLU 62%, XLY 54%, TLT 52%, VIG 33%, MTUM 27% | 12.6 | 9 | $214,551 |

Promotion and assessment ledger (per arm: promoted 12 → kept 3 → finalist):
- S: promoted 12 (6 distinct memberships, mean pairwise membership Jaccard distance 0.15; centre J_pool $288,659–$290,659; promotion share DD ≤ $35k 84.4%–93.8%).
  - kept: EDV EWW FXI GDX IAU IGV KRE SMH XHB XLY — refined by $0; J_nbA $177,486; J_nbB $173,235; share DD ok 92.2%; net p10/p50 $164,601/$233,668; A2 share DD ok 84.4%
  - kept: EDV EWW FXI GDX IAU IGV XHB XLY — refined by $0; J_nbA $176,117; J_nbB $177,811; share DD ok 95.3%; net p10/p50 $183,498/$232,874; A2 share DD ok 84.4%
  - kept: EDV EWW FXI GDX IAU IGV XHB XLY — refined by $0; J_nbA $176,071; J_nbB $178,806; share DD ok 95.3%; net p10/p50 $178,253/$233,870; A2 share DD ok 84.4% ← finalist
- I: promoted 12 (6 distinct memberships, mean pairwise membership Jaccard distance 0.13; centre J_pool $210,112–$214,551; promotion share DD ≤ $35k 15.6%–18.8%).
  - kept: EDV GDX IGV MTUM SMH TLT VIG XBI XHB XLU XLY XME — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 18.8%; net p10/p50 $90,634/$126,242; A2 share DD ok 28.1% ← finalist
  - kept: EDV GDX IGV MTUM SMH TLT VIG XBI XHB XLU XME — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 18.8%; net p10/p50 $85,441/$119,036; A2 share DD ok 28.1%
  - kept: EDV GDX IGV SMH TLT VIG XBI XHB XLU XLY XME — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 18.8%; net p10/p50 $87,948/$118,946; A2 share DD ok 28.1%

Pick D*_R1: arm S, 8 books — EDV EWW FXI GDX IAU IGV XHB XLY
| member | vector origin | nearest standalone phenotype | L1 distance (grid steps) |
|---|---|---|---:|
| EDV | g143:15 | representative | 100 |
| EWW | g156:40 | representative | 42 |
| FXI | g117:15 | alternative-1 | 1 |
| GDX | g47:13 | representative | 15 |
| IAU | g138:40 | alternative-1 | 39 |
| IGV | g152:44 | representative | 85 |
| XHB | g148:22 | representative | 52 |
| XLY | g131:24 | representative | 40 |

## fold-a R2 (body 5303dcdb3958; universe 49; budget share 1)
| arm | evaluations | feasible | distinct memberships | symbols tried | symbols in ≥ 25% of evaluations | effective symbols | median size | best feasible J_pool |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| S | 10000 | 98.4% | 1195 | 49 | GDX 95%, XHB 92%, ILF 89%, EWW 80%, EWY 76%, VIG 71%, EDV 71%, FXI 69% | 9.6 | 8 | $250,674 |
| I | 10000 | 87.7% | 1704 | 49 | IGV 94%, GDX 88%, VGT 87%, EDV 82%, SLV 78%, IWM 65%, XLP 58%, SMH 55% | 10.9 | 8 | $202,028 |

Promotion and assessment ledger (per arm: promoted 12 → kept 3 → finalist):
- S: promoted 12 (6 distinct memberships, mean pairwise membership Jaccard distance 0.15; centre J_pool $245,132–$250,674; promotion share DD ≤ $35k 62.5%–90.6%).
  - kept: EDV EWW EWY FXI GDX ILF VIG XHB — refined by $2,500; J_nbA $141,907; J_nbB $124,269; share DD ok 79.7%; net p10/p50 $114,181/$182,894; A2 share DD ok 62.5%
  - kept: EDV EWW EWY FXI GDX ILF VIG XHB — refined by $2,500; J_nbA $138,557; J_nbB $126,837; share DD ok 79.7%; net p10/p50 $112,274/$181,994; A2 share DD ok 62.5% ← finalist
  - kept: EDV EWW EWY FXI GDX IAU ILF VIG XHB — refined by $0; J_nbA $136,772; J_nbB $119,838; share DD ok 79.7%; net p10/p50 $113,447/$183,897; A2 share DD ok 62.5%
- I: promoted 12 (10 distinct memberships, mean pairwise membership Jaccard distance 0.15; centre J_pool $193,463–$202,028; promotion share DD ≤ $35k 75.0%–93.8%).
  - kept: EDV GDX IEMG IGV IJR IWD IWM SLV SMH VGT XLP — refined by $3,880; J_nbA $94,264; J_nbB $97,278; share DD ok 93.8%; net p10/p50 $104,882/$166,702; A2 share DD ok 59.4% ← finalist
  - kept: EDV GDX IGV IJR IWD IWM SLV SMH VGT XLP — refined by $0; J_nbA $81,133; J_nbB $27,899; share DD ok 54.7%; net p10/p50 $81,771/$128,782; A2 share DD ok 37.5%
  - kept: EDV GDX IGV IJR IWD IWM SLV SMH VGT XLP — refined by $2,500; J_nbA $78,172; J_nbB $31,000; share DD ok 54.7%; net p10/p50 $83,320/$129,428; A2 share DD ok 37.5%

Pick D*_R2: arm S, 8 books — EDV EWW EWY FXI GDX ILF VIG XHB
| member | vector origin | nearest standalone phenotype | L1 distance (grid steps) |
|---|---|---|---:|
| EDV | g174:26 | representative | 70 |
| EWW | g192:40 | representative | 45 |
| EWY | g195:10 | alternative-2 | 57 |
| FXI | g81:34 | alternative-1 | 30 |
| GDX | g176:37 | representative | 30 |
| ILF | g107:17 | alternative-1 | 35 |
| VIG | g158:1 | alternative-2 | 80 |
| XHB | g179:46 | representative | 70 |

## fold-b R1 (body 431321d18239; universe 54; budget share 1)
| arm | evaluations | feasible | distinct memberships | symbols tried | symbols in ≥ 25% of evaluations | effective symbols | median size | best feasible J_pool |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| S | 10000 | 98.4% | 1634 | 54 | GDX 96%, SMH 94%, FXI 93%, IBB 93%, XOP 89%, ILF 87%, XRT 86%, TLT 77%, KRE 72%, EWW 68%, XLY 65%, XLV 36% | 13.4 | 11 | $381,533 |
| I | 10000 | 89.3% | 1654 | 54 | XHB 93%, GDX 88%, XBI 83%, EWW 80%, EEM 73%, EDV 66%, LQD 51%, SLV 41% | 10.1 | 7 | $264,745 |

Promotion and assessment ledger (per arm: promoted 12 → kept 3 → finalist):
- S: promoted 12 (8 distinct memberships, mean pairwise membership Jaccard distance 0.14; centre J_pool $364,602–$381,533; promotion share DD ≤ $35k 40.6%–59.4%).
  - kept: EWW FXI GDX IBB ILF SMH TLT XLV XLY XOP XRT — refined by $0; J_nbA $99,278; J_nbB $134,933; share DD ok 68.8%; net p10/p50 $130,798/$198,514; A2 share DD ok 59.4%
  - kept: EWW FXI GDX IBB ILF SMH TLT XLV XLY XOP XRT — refined by $0; J_nbA $95,814; J_nbB $132,096; share DD ok 64.1%; net p10/p50 $140,438/$207,379; A2 share DD ok 59.4%
  - kept: EWW FXI GDX IBB ILF KRE SMH TLT XLY XOP XRT — refined by $2,500; J_nbA infeasible majority; J_nbB $162,030; share DD ok 75.0%; net p10/p50 $156,923/$238,192; A2 share DD ok 71.9% ← finalist
- I: promoted 12 (8 distinct memberships, mean pairwise membership Jaccard distance 0.14; centre J_pool $260,366–$264,745; promotion share DD ≤ $35k 96.9%–100.0%).
  - kept: EDV EEM EWW FXI GDX LQD SLV TLT XBI XHB — refined by $0; J_nbA $162,954; J_nbB $155,620; share DD ok 96.9%; net p10/p50 $152,717/$216,512; A2 share DD ok 75.0%
  - kept: EDV EEM EWW FXI GDX LQD SLV TLT XBI XHB — refined by $0; J_nbA $162,142; J_nbB $157,696; share DD ok 96.9%; net p10/p50 $153,071/$217,717; A2 share DD ok 68.8% ← finalist
  - kept: EDV EEM EWW FXI GDX IJR SLV TLT XBI XHB — refined by $0; J_nbA $160,537; J_nbB $152,832; share DD ok 95.3%; net p10/p50 $153,698/$215,012; A2 share DD ok 62.5%

Pick D*_R1: arm S, 11 books — EWW FXI GDX IBB ILF KRE SMH TLT XLY XOP XRT
| member | vector origin | nearest standalone phenotype | L1 distance (grid steps) |
|---|---|---|---:|
| EWW | g129:6 | representative | 36 |
| FXI | g127:29 | alternative-2 | 87 |
| GDX | g94:16 | alternative-1 | 33 |
| IBB | g52:6 | representative | 15 |
| ILF | g136:19 | representative | 40 |
| KRE | g117:10 | alternative-1 | 76 |
| SMH | g134:23 | alternative-1 | 48 |
| TLT | g88:7 | representative | 36 |
| XLY | g120:8 | representative | 15 |
| XOP | g125:0 | representative | 79 |
| XRT | g101:29 | alternative-1 | 38 |

## fold-b R2 (body fc8be32fbbaf; universe 54; budget share 1)
| arm | evaluations | feasible | distinct memberships | symbols tried | symbols in ≥ 25% of evaluations | effective symbols | median size | best feasible J_pool |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| S | 10000 | 99.4% | 1374 | 54 | EWZ 96%, XME 96%, XRT 95%, XOP 95%, KRE 95%, INDA 91%, GDX 90%, XBI 89%, FXI 83%, IWF 83%, XLV 81%, GLD 67% | 13.0 | 12 | $369,976 |
| I | 10000 | 90.0% | 1896 | 54 | EDV 94%, XHB 93%, SMH 86%, IBB 84%, KRE 83%, GDX 79%, EWW 75%, QUAL 71%, VGT 69%, INDA 58%, XBI 42% | 13.2 | 10 | $252,562 |

Promotion and assessment ledger (per arm: promoted 12 → kept 3 → finalist):
- S: promoted 12 (9 distinct memberships, mean pairwise membership Jaccard distance 0.14; centre J_pool $358,179–$369,976; promotion share DD ≤ $35k 71.9%–78.1%).
  - kept: EWZ FXI GDX GLD INDA IWF KRE TLT XBI XME XOP XRT — refined by $0; J_nbA $155,441; J_nbB $162,980; share DD ok 71.9%; net p10/p50 $173,448/$228,478; A2 share DD ok 25.0%
  - kept: EWZ FXI GDX GLD INDA IWF KRE XBI XME XOP XRT — refined by $7,142; J_nbA $148,706; J_nbB $153,361; share DD ok 70.3%; net p10/p50 $159,553/$212,421; A2 share DD ok 28.1%
  - kept: EWZ FXI GDX GLD INDA IWF KRE XBI XME XOP XRT — refined by $5,705; J_nbA $148,194; J_nbB $168,724; share DD ok 71.9%; net p10/p50 $172,230/$224,874; A2 share DD ok 25.0% ← finalist
- I: promoted 12 (9 distinct memberships, mean pairwise membership Jaccard distance 0.14; centre J_pool $239,666–$252,562; promotion share DD ≤ $35k 53.1%–59.4%).
  - kept: EDV EWW GDX IBB INDA KRE QUAL SMH VGT XBI XHB — refined by $0; J_nbA $85,726; J_nbB infeasible majority; share DD ok 35.9%; net p10/p50 $91,557/$135,581; A2 share DD ok 62.5% ← finalist
  - kept: EDV EWW GDX IBB INDA KRE QUAL SMH VGT XBI XHB XLU — refined by $0; J_nbA $83,226; J_nbB infeasible majority; share DD ok 35.9%; net p10/p50 $91,557/$138,887; A2 share DD ok 62.5%
  - kept: EDV EWW GDX IBB KRE QUAL SMH VGT XBI XHB XLU — refined by $2,500; J_nbA $81,338; J_nbB infeasible majority; share DD ok 35.9%; net p10/p50 $96,133/$141,251; A2 share DD ok 62.5%

Pick D*_R2: arm S, 11 books — EWZ FXI GDX GLD INDA IWF KRE XBI XME XOP XRT
| member | vector origin | nearest standalone phenotype | L1 distance (grid steps) |
|---|---|---|---:|
| EWZ | g121:17 | representative | 46 |
| FXI | g92:36 | alternative-2 | 42 |
| GDX | g56:6 | representative | 55 |
| GLD | g104:31 | representative | 25 |
| INDA | g111:46 | representative | 37 |
| IWF | g104:8 | representative | 37 |
| KRE | g100:17 | representative | 22 |
| XBI | g86:21 | alternative-2 | 13 |
| XME | g103:16 | representative | 66 |
| XOP | g86:40 | representative | 15 |
| XRT | g83:33 | representative | 15 |

## final R1 (body bfcace3389c2; universe 53; budget share 1)
| arm | evaluations | feasible | distinct memberships | symbols tried | symbols in ≥ 25% of evaluations | effective symbols | median size | best feasible J_pool |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| S | 16000 | 97.7% | 1765 | 53 | XME 97%, FXI 95%, KBE 95%, GDX 94%, EWW 93%, IWF 91%, EEM 87%, XLP 84%, LQD 65%, XLK 55%, XLI 29% | 11.4 | 10 | $475,419 |
| I | 16000 | 86.3% | 2078 | 53 | VGT 95%, GDX 93%, IYT 93%, KBE 87%, SMH 85%, EWJ 82%, EWW 81%, IGV 64%, EEM 63%, EWZ 62%, INDA 50%, IWF 43% | 12.6 | 11 | $336,069 |
| B (exploratory) | 16000 | 92.6% | 611 | 53 | XRT 96%, KRE 96%, XBI 95%, GDX 95%, EEM 85% | 5.8 | 5 | $415,531 |

Promotion and assessment ledger (per arm: promoted 12 → kept 3 → finalist):
- S: promoted 12 (6 distinct memberships, mean pairwise membership Jaccard distance 0.13; centre J_pool $469,721–$475,419; promotion share DD ≤ $35k 43.8%–50.0%).
  - kept: EEM EWW FXI GDX IWF KBE LQD XLK XLP XME — refined by $0; J_nbA split (half the draws infeasible); J_nbB infeasible majority; share DD ok 39.1%; net p10/p50 $165,548/$223,799; A2 share DD ok 21.9%
  - kept: EEM EWW FXI GDX IWF KBE LQD XLK XLP XME — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 39.1%; net p10/p50 $174,842/$231,302; A2 share DD ok 18.8% ← finalist
  - kept: EEM EWW FXI GDX IWF KBE LQD XLK XLP XLU XME — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 34.4%; net p10/p50 $178,995/$223,610; A2 share DD ok 18.8%
- I: promoted 12 (7 distinct memberships, mean pairwise membership Jaccard distance 0.14; centre J_pool $331,373–$336,069; promotion share DD ≤ $35k 6.3%–15.6%).
  - kept: EWJ EWW EWZ GDX IGV INDA IYT KBE SMH VGT — refined by $2,882; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 15.6%; net p10/p50 $115,282/$166,551; A2 share DD ok 15.6%
  - kept: EWJ EWW EWZ GDX IGV INDA IYT KBE SMH VGT — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 18.8%; net p10/p50 $113,066/$168,583; A2 share DD ok 15.6% ← finalist
  - kept: EEM EWW EWZ GDX IGV INDA IWF IYT KBE SMH VGT — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 15.6%; net p10/p50 $117,045/$162,091; A2 share DD ok 12.5%
- B: promoted 12 (6 distinct memberships, mean pairwise membership Jaccard distance 0.22; centre J_pool $408,288–$415,531; promotion share DD ≤ $35k 46.9%–62.5%).
  - kept: EEM GDX KRE XBI XRT — refined by $4,721; J_nbA $149,784; J_nbB infeasible majority; share DD ok 39.1%; net p10/p50 $152,776/$247,908; A2 share DD ok 15.6%
  - kept: EEM GDX KRE XBI XRT — refined by $4,721; J_nbA $143,409; J_nbB infeasible majority; share DD ok 35.9%; net p10/p50 $144,867/$244,996; A2 share DD ok 15.6%
  - kept: EEM GDX KRE XBI XRT — refined by $5,380; J_nbA $138,462; J_nbB infeasible majority; share DD ok 40.6%; net p10/p50 $167,698/$265,350; A2 share DD ok 12.5% ← finalist

Pick D*_R1: arm S, 10 books — EEM EWW FXI GDX IWF KBE LQD XLK XLP XME
| member | vector origin | nearest standalone phenotype | L1 distance (grid steps) |
|---|---|---|---:|
| EEM | g312:47 | alternative-3 | 25 |
| EWW | g299:12 | alternative-1 | 127 |
| FXI | g325:15 | alternative-2 | 60 |
| GDX | g197:26 | alternative-2 | 16 |
| IWF | g273:29 | alternative-2 | 62 |
| KBE | g320:20 | representative | 65 |
| LQD | g198:12 | representative | 63 |
| XLK | g297:21 | alternative-2 | 53 |
| XLP | g201:16 | alternative-1 | 56 |
| XME | g291:44 | representative | 54 |

## final R2 (body 8189f487a04b; universe 53; budget share 1)
| arm | evaluations | feasible | distinct memberships | symbols tried | symbols in ≥ 25% of evaluations | effective symbols | median size | best feasible J_pool |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| S | 16000 | 96.9% | 1396 | 53 | XME 96%, KRE 96%, TLT 96%, EWW 96%, ILF 95%, GDX 95%, XLK 93%, FXI 88%, KBE 85%, XLV 85%, SMH 80%, LQD 70% | 12.4 | 12 | $485,894 |
| I | 16000 | 88.8% | 2520 | 53 | VOOG 95%, GDX 92%, XLK 92%, SLV 87%, IWF 85%, EFA 79%, ILF 72%, XHB 70%, KBE 67%, MTUM 67%, IAU 48%, EDV 39%, INDA 29% | 14.2 | 11 | $391,508 |
| B (exploratory) | 16000 | 96.7% | 1499 | 53 | KRE 97%, XBI 97%, VGT 97%, GDX 97%, XRT 96%, FXI 94%, EWZ 94%, INDA 92%, SMH 88%, EWY 83%, TLT 82%, IJH 71% | 12.6 | 12 | $511,861 |

Promotion and assessment ledger (per arm: promoted 12 → kept 3 → finalist):
- S: promoted 12 (8 distinct memberships, mean pairwise membership Jaccard distance 0.15; centre J_pool $476,257–$485,894; promotion share DD ≤ $35k 18.8%–31.3%).
  - kept: EWW FXI GDX ILF KBE KRE LQD SMH TLT XLV XME — refined by $4,221; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 39.1%; net p10/p50 $207,037/$260,527; A2 share DD ok 12.5% ← finalist
  - kept: EWW FXI GDX ILF KBE KRE SMH TLT XLK XLV XME — refined by $5,188; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 34.4%; net p10/p50 $206,615/$264,603; A2 share DD ok 15.6%
  - kept: EWW FXI GDX ILF KBE KRE LQD SMH TLT VGT XLV XME — refined by $2,655; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 32.8%; net p10/p50 $199,254/$257,455; A2 share DD ok 12.5%
- I: promoted 12 (8 distinct memberships, mean pairwise membership Jaccard distance 0.14; centre J_pool $381,693–$391,508; promotion share DD ≤ $35k 40.6%–50.0%).
  - kept: EDV EWY GDX ILF INDA IWF KBE SLV VOOG XHB XLK — refined by $0; J_nbA split (half the draws infeasible); J_nbB $165,487; share DD ok 70.3%; net p10/p50 $170,674/$227,849; A2 share DD ok 40.6% ← finalist
  - kept: EDV EFA GDX ILF INDA IWF KBE LQD SLV VOOG XHB XLK — refined by $0; J_nbA split (half the draws infeasible); J_nbB $159,805; share DD ok 68.8%; net p10/p50 $171,673/$229,866; A2 share DD ok 34.4%
  - kept: EDV EFA GDX ILF INDA IWF KBE QUAL SLV VOOG XHB XLK — refined by $0; J_nbA split (half the draws infeasible); J_nbB $147,442; share DD ok 64.1%; net p10/p50 $162,162/$223,721; A2 share DD ok 28.1%
- B: promoted 12 (9 distinct memberships, mean pairwise membership Jaccard distance 0.15; centre J_pool $507,500–$511,861; promotion share DD ≤ $35k 12.5%–37.5%).
  - kept: EWY EWZ FXI GDX IJH INDA KRE SMH VGT XBI XRT — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 28.1%; net p10/p50 $254,775/$302,619; A2 share DD ok 21.9% ← finalist
  - kept: EMB EWZ FXI GDX IJH INDA KRE SMH TLT VGT XBI XRT — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 14.1%; net p10/p50 $220,682/$284,385; A2 share DD ok 18.8%
  - kept: EWZ FXI GDX IJH INDA KRE SMH TLT VGT XBI XRT — refined by $0; J_nbA infeasible majority; J_nbB infeasible majority; share DD ok 14.1%; net p10/p50 $218,510/$277,730; A2 share DD ok 15.6%

Pick D*_R2: arm I, 11 books — EDV EWY GDX ILF INDA IWF KBE SLV VOOG XHB XLK
| member | vector origin | nearest standalone phenotype | L1 distance (grid steps) |
|---|---|---|---:|
| EDV | g320:43 | representative | 150 |
| EWY | g320:37 | alternative-3 | 391 |
| GDX | g260:21 | alternative-1 | 449 |
| ILF | g259:10 | alternative-1 | 322 |
| INDA | g292:33 | alternative-1 | 464 |
| IWF | g91:14 | representative | 177 |
| KBE | g251:9 | alternative-1 | 235 |
| SLV | g318:22 | representative | 163 |
| VOOG | g251:25 | alternative-1 | 366 |
| XHB | g314:21 | representative | 266 |
| XLK | g270:0 | representative | 268 |

## Membership overlap of the picks (Jaccard similarity)
| pick | vs B5 | vs the other ranking (same window) | vs the same ranking in the previous window |
|---|---:|---:|---:|
| fold-a R1 | 0.08 | 0.45 | — |
| fold-a R2 | 0.08 | 0.45 | — |
| fold-b R1 | 0.23 | 0.29 | 0.27 |
| fold-b R2 | 0.33 | 0.29 | 0.12 |
| final R1 | 0.07 | 0.24 | 0.17 |
| final R2 | 0.07 | 0.24 | 0.16 |
