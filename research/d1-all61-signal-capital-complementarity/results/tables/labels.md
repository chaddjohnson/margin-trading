# Rubric outcome (PROTOCOL §9)

Source: `research/d1-all61-signal-capital-complementarity/results/analysis/ANALYSIS-2.json` (code freeze v2; amendment C1 supersedes ANALYSIS.json for labels and the reshuffle count; the verdict is identical).

**Verdict: no demonstrated economically useful complementarity** 


## k of n (fold replays)

| criterion | k |
|---|---|
| replays | 18 |
| allCostsPositive | 7 |
| material | 3 |
| complementType | 2 |
| notThin | 3 |
| C | 0 |
| R | 16 |
| CandR | 0 |
| reshuffleGains | 2 |
| signAgreementFirstOrderVsFullPath | 16 |
| ncMeetingC | none |


## Fold replay flags

| replay | ΔV 0/2/5/10 | all costs > 0 | floor | material | complement share | complement-type | not thin | beats NC | C | R | first-order vs full sign agree |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B4+U:GDX@A(S1) | −$10,060 / −$10,217 / −$10,452 / −$10,844 | False | $5,000 | False | NA | False | False | False | False | True | True |
| B4+U:XOP@A(NC) | $29,207 / $23,544 / $22,930 / $21,909 | True | $7,196 | True | -1.5% | False | False | True | False | True | False |
| B5+U:XOP@A(NC) | $44,078 / $38,728 / $38,585 / $38,346 | True | $7,196 | True | -0.9% | False | True | True | False | True | False |
| B4+P-A:GDX@A(S1) | −$15,986 / −$16,060 / −$16,172 / −$16,359 | False | $6,419 | False | NA | False | False | False | False | True | True |
| B4+P-A:XLB@A(SRC) | $497 / $497 / $496 / $496 | True | $5,000 | False | 0.0% | False | True | False | False | True | True |
| B4+P-A:XME@A(NC) | $3,913 / $3,871 / $3,809 / $3,705 | True | $5,000 | False | 100.0% | True | False | True | False | True | True |
| B5+P-A:IGV@A(S1) | −$18,464 / −$18,537 / −$18,646 / −$18,829 | False | $5,052 | False | NA | False | False | False | False | True | True |
| B5+P-A:XLB@A(SRC) | $497 / $497 / $496 / $496 | True | $5,000 | False | 0.0% | False | False | False | False | True | True |
| B5+P-A:XME@A(NC) | $4,179 / $4,257 / $4,374 / $4,569 | True | $5,000 | False | 87.1% | True | False | True | False | True | True |
| B4+U:GDX@B(S1) | −$51,444 / −$51,505 / −$47,656 / −$46,758 | False | $6,587 | False | NA | False | False | False | False | True | True |
| B4+U:XOP@B(NC) | $44,723 / $44,784 / $44,877 / $26,055 | True | $5,000 | True | 3.3% | False | True | True | False | True | True |
| B5+U:EWZ@B(NC) | −$53,362 / −$53,386 / −$52,815 / −$51,864 | False | $10,605 | False | NA | False | False | True | False | False | True |
| B4+P-B:FXI@B(S1) | −$20,698 / −$20,731 / −$20,780 / −$19,484 | False | $7,599 | False | NA | False | False | True | False | False | True |
| B4+P-B:XOP@B(SRC) | −$1,319 / −$1,359 / −$1,418 / −$1,517 | False | $5,000 | False | NA | False | False | True | False | True | True |
| B4+P-B:IJR@B(NC) | −$23,520 / −$23,711 / −$23,996 / −$24,472 | False | $6,509 | False | NA | False | False | True | False | True | True |
| B5+P-B:SMH@B(S1) | −$36,474 / −$36,865 / −$36,843 / −$36,808 | False | $15,985 | False | NA | False | False | False | False | True | True |
| B5+P-B:XOP@B(SRC) | −$1,319 / −$1,359 / −$1,418 / −$1,517 | False | $5,000 | False | NA | False | False | True | False | True | True |
| B5+P-B:IJR@B(NC) | −$18,669 / −$18,702 / −$18,751 / −$18,832 | False | $5,000 | False | NA | False | False | True | False | True | True |


## Other replays (incumbent diagnostic, in-sample; never in the verdict)

| replay | ΔV 0/2/5/10 | complement share | first-order Δ | full-path Δ@5 |
|---|---|---|---|---|
| B4+B5:GDX@A(incumbent diagnostic) | −$14,871 / −$15,184 / −$15,655 / −$16,438 | NA | $0 | −$15,655 |
| B4+U:GDX@T(in-sample) | $859 / $537 / $3,992 / $4,235 | -205.0% | $1,494 | $3,992 |
| B4+U:XOP@T(in-sample) | $57,909 / $50,872 / $48,199 / $29,116 | -19.4% | −$118,582 | $48,199 |
| B5+U:EWZ@T(in-sample) | −$165,373 / −$165,835 / −$165,919 / −$166,059 | NA | −$137,900 | −$165,919 |
| B5+U:XOP@T(in-sample) | −$11,390 / −$17,960 / −$19,932 / −$37,847 | NA | −$95,019 | −$19,932 |
| B4+B5:GDX@T(incumbent diagnostic) | $147,541 / $147,042 / $146,293 / $146,000 | 1.2% | $89,729 | $146,293 |
| B4+B5:GDX@B(incumbent diagnostic) | $57,531 / $57,787 / $58,171 / $59,764 | 3.0% | $37,260 | $58,171 |


## Labels, view U

| baseline | label | n | ETFs |
|---|---|---|---|
| B4 | asynchronously timed but uneconomic | 3 | EWZ°, GDX°, XHB |
| B4 | coincident only | 4 | INDA, KBE, KIEᵗ, VGK |
| B4 | economically interesting but mostly competing | 28 | DBCᵗ, EDVᵗ, EEM, EWY, IBB, IJH, IJR, IWD, IWF, IWM, IWN, IYTᵗ, MTUM, QUAL, RSP, SLV, SMH, SPLV, TLT°, VOOGᵗ, VPUᵗ, XLB, XLE°, XLF, XLI, XLK, XLU°, XLY |
| B4 | economically interesting but mostly competing (reshuffle) | 1 | XOP° |
| B4 | exploratory marginal complement (Level D only) | 1 | ILFᵗ [thin] |
| B4 | insufficient (single idle-clean event) | 4 | EWW, FXI, IGV, XME |
| B4 | not evaluable / insufficient | 20 | AGG [too few decisions], EFA [too few decisions], EMB [too few decisions], EWJ [too few decisions], GLD° [too few decisions], HYG [too few decisions], IAU [too few decisions], IEF [too few decisions], IEMG [too few decisions], KRE [member of the baseline], LQD [too few decisions], SHY [too few decisions], TIP [too few decisions], USMV [too few decisions], VGT [member of the baseline], VIG [too few decisions], XBI [member of the baseline], XLP [too few decisions], XLV [too few decisions], XRT [member of the baseline] |
| B5 | asynchronously timed but uneconomic | 2 | EWZ°, XHB |
| B5 | coincident only | 4 | INDA, KBE, KIEᵗ, VGK |
| B5 | economically interesting but mostly competing | 29 | DBCᵗ, EDVᵗ, EEM, EWY, FXI, IBB, IJH, IJR, IWD, IWF, IWM, IWN, IYTᵗ, MTUM, QUAL, RSP, SLV, SMH, SPLV, TLT°, VOOGᵗ, VPUᵗ, XLB, XLE°, XLF, XLI, XLK, XLU°, XLY |
| B5 | economically interesting but mostly competing (reshuffle) | 1 | XOP° |
| B5 | exploratory marginal complement (Level D only) | 1 | ILFᵗ [thin] |
| B5 | insufficient (single idle-clean event) | 3 | EWW, IGV, XME |
| B5 | not evaluable / insufficient | 21 | AGG [too few decisions], EFA [too few decisions], EMB [too few decisions], EWJ [too few decisions], GDX° [member of the baseline], GLD° [too few decisions], HYG [too few decisions], IAU [too few decisions], IEF [too few decisions], IEMG [too few decisions], KRE [member of the baseline], LQD [too few decisions], SHY [too few decisions], TIP [too few decisions], USMV [too few decisions], VGT [member of the baseline], VIG [too few decisions], XBI [member of the baseline], XLP [too few decisions], XLV [too few decisions], XRT [member of the baseline] |


## Labels, view P-A

| baseline | label | n | ETFs |
|---|---|---|---|
| B4 | coincident only | 5 | EWW, GLD°, SMH, TLT°, VGK |
| B4 | economically interesting but mostly competing | 14 | EFA, EWJ, EWY, GDX°, IEMG, IGV, IJH, IWD, IWF, KBE, XHB, XLF, XLK, XME |
| B4 | insufficient (single idle-clean event) | 6 | EDVᵗ, FXI, IAU, IBB, ILFᵗ, SLV |
| B4 | not evaluable / insufficient | 36 | AGG [no vector], DBCᵗ [too few decisions], EEM [no vector], EMB [too few decisions], EWZ° [no vector], HYG [too few decisions], IEF [no vector], IJR [too few decisions], INDA [no vector], IWM [too few decisions], IWN [no vector], IYTᵗ [too few decisions], KIEᵗ [no vector], KRE [member of the baseline], LQD [too few decisions], MTUM [too few decisions], QUAL [too few decisions], RSP [too few decisions], SHY [no vector], SPLV [no vector], TIP [no vector], USMV [too few decisions], VGT [member of the baseline], VIG [too few decisions], VOOGᵗ [too few decisions], VPUᵗ [too few decisions], XBI [member of the baseline], XLB [too few decisions], XLE° [no vector], XLI [too few decisions], XLP [too few decisions], XLU° [too few decisions], XLV [too few decisions], XLY [too few decisions], XOP° [no vector], XRT [member of the baseline] |
| B5 | coincident only | 5 | EWW, GLD°, SMH, TLT°, VGK |
| B5 | economically interesting but mostly competing | 13 | EFA, EWJ, EWY, IEMG, IGV, IJH, IWD, IWF, KBE, XHB, XLF, XLK, XME |
| B5 | insufficient (single idle-clean event) | 6 | EDVᵗ, FXI, IAU, IBB, ILFᵗ, SLV |
| B5 | not evaluable / insufficient | 37 | AGG [no vector], DBCᵗ [too few decisions], EEM [no vector], EMB [too few decisions], EWZ° [no vector], GDX° [member of the baseline], HYG [too few decisions], IEF [no vector], IJR [too few decisions], INDA [no vector], IWM [too few decisions], IWN [no vector], IYTᵗ [too few decisions], KIEᵗ [no vector], KRE [member of the baseline], LQD [too few decisions], MTUM [too few decisions], QUAL [too few decisions], RSP [too few decisions], SHY [no vector], SPLV [no vector], TIP [no vector], USMV [too few decisions], VGT [member of the baseline], VIG [too few decisions], VOOGᵗ [too few decisions], VPUᵗ [too few decisions], XBI [member of the baseline], XLB [too few decisions], XLE° [no vector], XLI [too few decisions], XLP [too few decisions], XLU° [too few decisions], XLV [too few decisions], XLY [too few decisions], XOP° [no vector], XRT [member of the baseline] |


## Labels, view P-B

| baseline | label | n | ETFs |
|---|---|---|---|
| B4 | asynchronously timed but uneconomic | 2 | LQD, XLY |
| B4 | coincident only | 15 | EDVᵗ, EEM, EMB, EWY, IAU, IBB, IGV, INDA, IWF, MTUM, QUAL, SLV, TLT°, XHB, XLK |
| B4 | economically interesting but mostly competing | 16 | EFA, EWW, EWZ°, GDX°, GLD°, IJH, ILFᵗ, RSP, USMV, VPUᵗ, XLB, XLE°, XLF, XLV, XME, XOP° |
| B4 | insufficient (single idle-clean event) | 8 | FXI, IJR, IYTᵗ, KBE, SMH, VIG, VOOGᵗ, XLP |
| B4 | not evaluable / insufficient | 20 | AGG [no vector], DBCᵗ [too few decisions], EWJ [too few decisions], HYG [no vector], IEF [no vector], IEMG [no vector], IWD [too few decisions], IWM [too few decisions], IWN [too few decisions], KIEᵗ [too few decisions], KRE [member of the baseline], SHY [no vector], SPLV [no vector], TIP [no vector], VGK [too few decisions], VGT [member of the baseline], XBI [member of the baseline], XLI [too few decisions], XLU° [too few decisions], XRT [member of the baseline] |
| B5 | coincident only | 19 | EDVᵗ, EEM, EMB, EWY, FXI, IAU, IBB, IGV, IJR, INDA, IWF, MTUM, QUAL, SLV, TLT°, XHB, XLK, XLP, XLY |
| B5 | economically interesting but mostly competing | 17 | EFA, EWW, EWZ°, GLD°, IJH, ILFᵗ, KBE, RSP, USMV, VIG, VPUᵗ, XLB, XLE°, XLF, XLV, XME, XOP° |
| B5 | insufficient (single idle-clean event) | 4 | IYTᵗ, LQD, SMH, VOOGᵗ |
| B5 | not evaluable / insufficient | 21 | AGG [no vector], DBCᵗ [too few decisions], EWJ [too few decisions], GDX° [member of the baseline], HYG [no vector], IEF [no vector], IEMG [no vector], IWD [too few decisions], IWM [too few decisions], IWN [too few decisions], KIEᵗ [too few decisions], KRE [member of the baseline], SHY [no vector], SPLV [no vector], TIP [no vector], VGK [too few decisions], VGT [member of the baseline], XBI [member of the baseline], XLI [too few decisions], XLU° [too few decisions], XRT [member of the baseline] |
