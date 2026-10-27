# Opportunity capture and timing (Stage C2 — the primary diagnostic)

**Evidence tier: T-train (2016-01-04 → 2023-12-29).** Each base phenotype and every one of its 128 joint and up to 32
OAT neighbours is attributed to the bound, price-only episode catalog (`OPPORTUNITY_EVENT_CATALOG.md`). Labels are
retrospective; no label or future price enters a trade decision. Machine-readable: `results/tables/capture_ledger.csv`
(every phenotype × eligible episode: base outcome, entries, dip entries, net, timing, MAE, and the neighbour
distributions) and `results/tables/base_trades.csv` (every base lot with its episode, phase and dip flag).

## Definitions (PROTOCOL.md §7, bound in `events.ts`)

- A lot belongs to the episode whose (peak, rebound end] contains its entry session; *decline phase* (peak, trough],
  *rebound phase* (trough, end]; otherwise *outside*.
- **Dip entry:** entered in the decline phase, or at least 50% of the episode's depth below its peak. **Dip-captured:**
  dip entries with net > 0. A profitable continuation re-entry high in the rebound counts as *captured* but not as a
  dip capture.
- Outcomes per episode: **captured** | **entered, loss** | **in position** (a lot from before the peak rode the
  decline) | **armed, no entry** (it never occurs in any of the 21 phenotypes' base or neighbour runs: with Y at
  0.2–4.7%, an armed book fills almost at once, so "joint no entry" below is in effect "not armed") | **not armed** (the deep condition never held on a flat session — a deep-path
  reconstruction; "< X" marks episodes shallower than the vector's X, which D1 cannot arm on by design) | ineligible
  (before 2017-06-15).
- **Independent dip events** (F1, the families axis): dip families whose anchor troughs are ≥ 252 sessions apart.
  **M** = the eligible major families the base dip-captured; **neighbour capture** = per joint sample, the share of M
  it also dip-captures (median over 128); **winner kept by** = the share of joint samples keeping ≥ 50% of the base's
  net in the top winner's episode.

## Summary per phenotype

| Phenotype | lots (dip / in episodes / outside) | independent dip events (dip families / eligible) | major dip families (M) | neighbour capture median (seed 1 / 2) | top winner kept by | falling-knife losses | lots MAE ≤ −10% | deep / continuation lots (net) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| VGT primary (control) | 17 (16 / 16 / 1) | 3 (5 / 7) | 4: VGT-F03 VGT-F04 VGT-F06 VGT-F07 | 75% (75% / 75%) | 66% ($51,264, 2020-04-02, VGT-E06) | 4 (−$9,195) | 1 | 11 ($103,590) / 6 ($31,769) |
| VGT research rep. (procedure-matched control) | 17 (15 / 16 / 1) | 4 (5 / 7) | 3: VGT-F03 VGT-F04 VGT-F07 | 33% (33% / 50%) | 85% ($46,991, 2020-04-03, VGT-E06) | 6 (−$12,903) | 1 | 14 ($92,688) / 3 ($32,530) |
| XME:representative | 20 (19 / 19 / 1) | 2 (4 / 10) | 2: XME-F07 XME-F10 | 100% (100% / 100%) | 35% ($46,781, 2020-10-29, XME-E14) | 4 (−$23,256) | 1 | 7 ($45,493) / 13 ($171,446) |
| XME:alternative-1 | 62 (55 / 60 / 2) | 4 (8 / 10) | 5: XME-F05 XME-F07 XME-F10 XME-F11 XME-F12 | 60% (60% / 60%) | 32% ($12,011, 2021-07-19, XME-E17) | 12 (−$66,316) | 4 | 51 ($118,694) / 11 ($14,625) |
| GDX:representative | 54 (51 / 51 / 3) | 5 (8 / 10) | 5: GDX-F05 GDX-F07 GDX-F09 GDX-F10 GDX-F12 | 80% (80% / 80%) | 100% ($36,676, 2020-03-16, GDX-E15) | 28 (−$52,613) | 0 | 42 ($146,176) / 12 ($39,358) |
| GDX:alternative-1 | 45 (42 / 42 / 3) | 4 (6 / 10) | 5: GDX-F05 GDX-F07 GDX-F09 GDX-F10 GDX-F12 | 80% (80% / 80%) | 100% ($36,676, 2020-03-16, GDX-E15) | 19 (−$31,087) | 0 | 35 ($129,662) / 10 ($42,522) |
| KBE:representative | 69 (58 / 62 / 7) | 4 (6 / 9) | 4: KBE-F03 KBE-F05 KBE-F08 KBE-F09 | 75% (75% / 75%) | 98% ($19,991, 2018-12-26, KBE-E04) | 26 (−$72,477) | 1 | 58 ($107,478) / 11 ($29,660) |
| KBE:alternative-1 | 56 (49 / 51 / 5) | 4 (8 / 9) | 4: KBE-F03 KBE-F05 KBE-F08 KBE-F09 | 50% (50% / 75%) | 74% ($21,454, 2023-11-09, KBE-E20) | 19 (−$92,484) | 7 | 43 ($95,782) / 13 ($27,899) |
| SLV:representative | 25 (17 / 21 / 4) | 2 (4 / 10) | 3: SLV-F06 SLV-F09 SLV-F10 | 67% (67% / 100%) | 71% ($22,913, 2020-06-10, SLV-E08) | 1 (−$5,194) | 1 | 8 ($36,541) / 17 ($67,252) |
| FXI:representative | 8 (8 / 8 / 0) | 3 (5 / 9) | 4: FXI-F05 FXI-F07 FXI-F09 FXI-F10 | 75% (75% / 75%) | 53% ($40,292, 2022-10-24, FXI-E14) | 2 (−$1,853) | 0 | 5 ($87,087) / 3 ($2,085) |
| FXI:alternative-1 | 9 (9 / 9 / 0) | 3 (5 / 9) | 3: FXI-F05 FXI-F07 FXI-F09 | 67% (67% / 67%) | 63% ($36,885, 2022-10-24, FXI-E14) | 3 (−$9,667) | 0 | 4 ($84,168) / 5 ($2,110) |
| IJH:representative | 24 (19 / 21 / 3) | 3 (4 / 5) | 3: IJH-F02 IJH-F03 IJH-F04 | 100% (100% / 100%) | 39% ($17,391, 2018-12-26, IJH-E02) | 2 (−$1,115) | 1 | 14 ($65,751) / 10 ($21,416) |
| IJH:alternative-1 | 46 (44 / 45 / 1) | 4 (5 / 5) | 3: IJH-F02 IJH-F03 IJH-F04 | 67% (67% / 83%) | 84% ($17,009, 2018-12-26, IJH-E02) | 16 (−$45,795) | 2 | 46 ($79,382) / 0 ($0) |
| XLB:representative | 18 (8 / 11 / 7) | 2 (2 / 5) | 2: XLB-F03 XLB-F05 | 100% (100% / 100%) | 72% ($11,947, 2020-10-28) | 0 ($0) | 0 | 6 ($25,954) / 12 ($58,054) |
| MTUM:representative | 16 (16 / 16 / 0) | 3 (4 / 6) | 3: MTUM-F03 MTUM-F04 MTUM-F06 | 100% (100% / 100%) | 53% ($19,207, 2018-12-24, MTUM-E03) | 1 (−$856) | 1 | 13 ($61,134) / 3 ($8,747) |
| MTUM:alternative-1 | 22 (19 / 20 / 2) | 3 (3 / 6) | 3: MTUM-F03 MTUM-F04 MTUM-F06 | 67% (67% / 67%) | 47% ($17,602, 2018-12-24, MTUM-E03) | 7 (−$15,422) | 1 | 14 ($49,379) / 8 ($12,919) |
| XHB:representative | 20 (13 / 14 / 6) | 3 (4 / 6) | 3: XHB-F03 XHB-F04 XHB-F06 | 67% (67% / 67%) | 53% ($17,628, 2020-06-15) | 5 (−$13,482) | 2 | 13 ($83,554) / 7 ($50,591) |
| EWW:representative | 38 (31 / 35 / 3) | 4 (6 / 8) | 2: EWW-F04 EWW-F06 | 50% (50% / 50%) | 28% ($17,259, 2020-10-16, EWW-E11) | 8 (−$23,284) | 0 | 35 ($84,637) / 3 ($19,640) |
| EWW:alternative-1 | 41 (31 / 36 / 5) | 4 (6 / 8) | 2: EWW-F04 EWW-F06 | 100% (100% / 100%) | 76% ($11,791, 2022-09-26, EWW-E15) | 6 (−$20,923) | 1 | 39 ($84,191) / 2 ($10,119) |
| EDV:representative | 10 (10 / 10 / 0) | 3 (4 / 6) | 2: EDV-F05 EDV-F07 | 100% (100% / 100%) | 48% ($22,999, 2023-10-23, EDV-E11) | 3 (−$3,105) | 0 | 5 ($54,478) / 5 ($8,250) |
| EDV:alternative-1 | 20 (20 / 20 / 0) | 3 (4 / 6) | 2: EDV-F05 EDV-F07 | 50% (50% / 50%) | 32% ($17,407, 2022-11-08, EDV-E08) | 8 (−$11,439) | 0 | 14 ($49,225) / 6 ($6,156) |

Columns: lots split into dip entries, lots inside some episode, and lots outside every episode; falling-knife losses =
decline-phase entries that lost (count and net).

## Findings

- **The big rebounds are real events, and most are captured by most neighbours.** The 2020 crash is the clearest:
  GDX's March 2020 episodes (GDX-E15, E16) are dip-captured by **100%** of its 128 joint neighbours (median episode net
  $39.6k and $28.5k); VGT primary's March 2020 rebound (VGT-E06) by 98% (median $49.7k); XME's May–June 2020 legs
  (XME-E12, E13) by 91% and 84%. Q4 2018 is the second shared event: VGT-E03 85%, GDX's 2018 decline (GDX-E10) 96%,
  EWW-E07 91%, KBE's December 2018 winner kept by 98%.
- **Some fitted winners are parameter-specific.** XME's second-largest winner (January 2022, +$37,205, XME-E20) is
  captured by **0%** of its neighbours, and its 2021 captures (XME-E15 to E19) by 0–17%; its top winner (September
  2020, +$46,781) is kept by 35%. GDX's January 2022 winner (+$24,593) is kept by 39%. EWW's top winner (October 2020
  re-entry, +$17,259, EWW-E11) is kept by only **28%** — just above the 25% F5 line — while EWW's September 2022
  winner is kept by 84%. These are the cases where the stored net leans on one exact vector.
- **Neighbour capture of major events (F4).** GDX (5 major dip families) 80%; KBE 75%; FXI 75%; VGT primary (4) 75%;
  SLV 67%; EWW (2) **50%** — exactly at the threshold (a sample dip-captures one of EWW's two major families in the
  median case), and EWW's second major family (EWW-F06, the 2020 crash) is in M only by a base dip net of +$1,233: its
  crash-leg dip entry made +$8,165 but later dip entries lost $6,932, and most of EWW's 2020 profit came from non-dip
  re-entries high in the rebound; XME representative 100% of its 2; the procedure-matched VGT control 33% (**F4 raised**).
- **Falling knives.** Entering ongoing collapses costs real money in the high-turnover vectors: GDX 28 losing
  decline-phase entries (−$52,613), KBE 26 (−$72,477), KBE alt 19 (−$92,484), XME alt 12 (−$66,316); VGT primary 4
  (−$9,195), EWW 8 (−$23,284). These losses are part of D1's design (it buys a small rebound inside a decline) and are
  more than paid for by the captured rebounds in every phenotype here, but they set the drawdown.
- **Intratrade adverse excursion** is moderate at the base: the worst MAE is −7.2% (GDX), −8.9% (EWW), −10.8% (VGT
  primary), −12.3% (IJH), −17.3% (KBE), −20.9% (XME) and −26.5% (KBE alt — beyond the −25% F2 line).
- **Independence.** With families at least 252 sessions apart, GDX shows 5 independent dip events, KBE, EWW, XME alt
  and IJH alt 4, VGT primary 3; XME's representative, SLV and XLB only 2, which is the floor F1 needs. Several entries in
  one event (e.g. GDX's three March 2020 lots) count once.
- **Missed and shallow events.** Every phenotype has eligible episodes it never armed on — mostly episodes shallower
  than its X (often 20–28%), which D1 cannot arm on by design, plus episodes with a lot already open. EWW never armed
  in 2021–2022's shallower Mexican dips (EWW-E12 to E14, 11–14%); XME's representative never armed in 2017–2019,
  including the 35% decline of June–December 2018 (XME-E07): its X of 27.7% is measured from a 25-session high, and
  that slow six-month decline never fell 27.7% within 25 sessions.

## Event-by-event tables (eligible episodes; base outcome and the 128 joint neighbours)

"joint no entry" = armed without entry plus not armed. Episode net in the joint columns is the attributed net of the
lots each neighbour entered in that episode.

### VGT primary (control)

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| VGT-E02 | 2018-01-26 → 2018-02-08 | 10% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| VGT-E03 | 2018-10-03 → 2018-12-24 | 24% | F03 | captured (dip) | $20,250 | 85% | 85% | 15% | 0% | 0% | $20,394 [−$149, $22,045] | 0 |
| VGT-E04 | 2019-05-03 → 2019-06-03 | 11% (< X) | F03 | in position | — | 20% | 20% | 0% | 66% | 15% | $0 [$0, $6,747] | 0 |
| VGT-E05 | 2020-02-19 → 2020-03-12 | 28% | F04 | entered, loss | −$1,249 | 0% | 0% | 100% | 0% | 0% | −$7,835 [−$12,355, −$3,544] | 5 |
| VGT-E06 | 2020-03-13 → 2020-03-23 | 16% (< X) | F04 | captured (dip) | $60,279 | 100% | 98% | 0% | 0% | 0% | $49,658 [$13,313, $57,231] | 3 |
| VGT-E07 | 2020-09-02 → 2020-09-23 | 13% (< X) | F05 | in position | — | 1% | 1% | 16% | 52% | 31% | $0 [−$1,224, $0] | 0 |
| VGT-E08 | 2020-10-12 → 2020-10-30 | 10% (< X) | F05 | captured (dip) | $13,031 | 42% | 42% | 11% | 0% | 47% | $0 [−$778, $13,262] | 0 |
| VGT-E09 | 2021-02-12 → 2021-03-08 | 11% (< X) | F05 | captured (dip) | $3,313 | 23% | 23% | 0% | 19% | 58% | $0 [$0, $3,179] | 1 |
| VGT-E10 | 2021-12-27 → 2022-03-14 | 21% (< X) | F06 | captured (dip) | $7,590 | 45% | 45% | 9% | 0% | 46% | $0 [$0, $7,977] | 4 |
| VGT-E11 | 2022-03-29 → 2022-06-16 | 26% | F06 | captured (dip) | $10,636 | 73% | 73% | 27% | 0% | 0% | $3,980 [−$3,400, $10,891] | 12 |
| VGT-E12 | 2022-08-15 → 2022-10-14 | 23% | F07 | captured (dip) | $3,919 | 85% | 85% | 15% | 0% | 0% | $2,694 [−$1,864, $6,144] | 4 |
| VGT-E13 | 2022-12-01 → 2022-12-28 | 11% (< X) | F07 | in position | — | 0% | 0% | 9% | 90% | 1% | $0 [$0, $0] | 1 |
| VGT-E14 | 2023-07-18 → 2023-10-26 | 13% (< X) | F08 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |

### VGT research rep. (procedure-matched control)

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| VGT-E02 | 2018-01-26 → 2018-02-08 | 10% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| VGT-E03 | 2018-10-03 → 2018-12-24 | 24% | F03 | captured (dip) | $19,868 | 80% | 80% | 20% | 0% | 0% | $19,866 [−$358, $21,400] | 0 |
| VGT-E04 | 2019-05-03 → 2019-06-03 | 11% (< X) | F03 | in position | — | 0% | 0% | 0% | 80% | 20% | $0 [$0, $0] | — |
| VGT-E05 | 2020-02-19 → 2020-03-12 | 28% | F04 | entered, loss | −$4,542 | 0% | 0% | 100% | 0% | 0% | −$8,305 [−$11,332, −$4,685] | 0 |
| VGT-E06 | 2020-03-13 → 2020-03-23 | 16% (< X) | F04 | captured (dip) | $53,895 | 98% | 75% | 2% | 0% | 0% | $48,065 [$24,307, $52,741] | 2 |
| VGT-E07 | 2020-09-02 → 2020-09-23 | 13% (< X) | F05 | in position | — | 0% | 0% | 13% | 75% | 13% | $0 [−$1,533, $0] | 0 |
| VGT-E08 | 2020-10-12 → 2020-10-30 | 10% (< X) | F05 | captured (dip) | $12,040 | 75% | 75% | 0% | 0% | 25% | $10,125 [$0, $12,530] | 1 |
| VGT-E09 | 2021-02-12 → 2021-03-08 | 11% (< X) | F05 | in position | — | 5% | 5% | 11% | 59% | 25% | $0 [−$543, $0] | 0 |
| VGT-E10 | 2021-12-27 → 2022-03-14 | 21% (< X) | F06 | not armed | — | 0% | 0% | 19% | 0% | 81% | $0 [−$1,314, $0] | 2 |
| VGT-E11 | 2022-03-29 → 2022-06-16 | 26% | F06 | entered, loss | −$2,178 | 22% | 22% | 78% | 0% | 0% | −$5,422 [−$14,221, $2,642] | 5 |
| VGT-E12 | 2022-08-15 → 2022-10-14 | 23% | F07 | entered, loss | −$148 | 4% | 4% | 96% | 0% | 0% | −$5,922 [−$14,955, −$1,336] | 4 |
| VGT-E13 | 2022-12-01 → 2022-12-28 | 11% (< X) | F07 | captured (dip) | $25,793 | 58% | 57% | 14% | 28% | 0% | $2,879 [−$1,604, $24,310] | 7 |
| VGT-E14 | 2023-07-18 → 2023-10-26 | 13% (< X) | F08 | captured (dip) | $15,704 | 12% | 12% | 13% | 3% | 72% | $0 [−$169, $13,538] | 22 |

### XME:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| XME-E04 | 2017-02-13 → 2017-06-20 | 20% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E05 | 2018-01-11 → 2018-02-08 | 13% (< X) | F04 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E06 | 2018-02-16 → 2018-03-28 | 13% (< X) | F04 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E07 | 2018-06-06 → 2018-12-24 | 35% | F05 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E08 | 2019-02-20 → 2019-05-31 | 23% (< X) | F05 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E09 | 2019-07-24 → 2019-08-15 | 15% (< X) | F06 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E10 | 2019-09-16 → 2019-10-02 | 10% (< X) | F06 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E11 | 2019-12-12 → 2020-03-23 | 52% | F07 | captured (dip) | $18,165 | 79% | 79% | 21% | 0% | 0% | $5,097 [−$12,175, $18,698] | 0 |
| XME-E12 | 2020-05-08 → 2020-05-13 | 11% (< X) | F07 | captured (dip) | $18,486 | 91% | 91% | 0% | 4% | 5% | $18,703 [$104, $20,277] | 0 |
| XME-E13 | 2020-06-08 → 2020-06-26 | 15% (< X) | F07 | captured (dip) | $16,710 | 84% | 84% | 10% | 0% | 6% | $16,258 [−$58, $17,664] | 0 |
| XME-E14 | 2020-09-18 → 2020-09-23 | 11% (< X) | F08 | captured (dip) | $46,781 | 35% | 35% | 20% | 28% | 16% | $0 [−$1,152, $47,880] | 28 |
| XME-E15 | 2021-01-06 → 2021-01-29 | 13% (< X) | F08 | captured (dip) | $16,378 | 17% | 17% | 46% | 0% | 37% | $0 [−$5,560, $15,237] | 3 |
| XME-E16 | 2021-03-11 → 2021-03-24 | 12% (< X) | F08 | captured (dip) | $13,357 | 15% | 15% | 2% | 0% | 83% | $0 [$0, $12,642] | 0 |
| XME-E17 | 2021-06-01 → 2021-07-19 | 17% (< X) | F09 | captured (dip) | $6,310 | 15% | 15% | 0% | 0% | 85% | $0 [$0, $6,310] | 0 |
| XME-E18 | 2021-08-11 → 2021-09-21 | 13% (< X) | F09 | captured (dip) | $7,304 | 15% | 15% | 0% | 0% | 85% | $0 [$0, $4,335] | 0 |
| XME-E19 | 2021-11-12 → 2021-12-01 | 15% (< X) | F09 | captured (dip) | $8,264 | 0% | 0% | 8% | 7% | 85% | $0 [$0, $0] | 0 |
| XME-E20 | 2022-01-12 → 2022-01-27 | 14% (< X) | F10 | captured (dip) | $37,205 | 0% | 0% | 7% | 0% | 93% | $0 [$0, $0] | 0 |
| XME-E21 | 2022-04-14 → 2022-05-12 | 26% (< X) | F10 | captured (dip) | $5,375 | 81% | 81% | 0% | 0% | 19% | $7,605 [$0, $8,987] | 0 |
| XME-E22 | 2022-06-07 → 2022-07-06 | 28% | F10 | captured (dip) | $17,723 | 100% | 100% | 0% | 0% | 0% | $16,886 [$13,774, $19,172] | 3 |
| XME-E23 | 2022-08-25 → 2022-09-26 | 23% (< X) | F11 | entered, loss | −$4,248 | 5% | 5% | 95% | 0% | 0% | −$2,490 [−$5,135, −$729] | 1 |
| XME-E24 | 2022-12-02 → 2022-12-19 | 11% (< X) | F11 | not armed | — | 0% | 0% | 5% | 0% | 95% | $0 [$0, $0] | 0 |
| XME-E25 | 2023-03-03 → 2023-05-31 | 25% (< X) | F12 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |

### XME:alternative-1

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| XME-E04 | 2017-02-13 → 2017-06-20 | 20% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E05 | 2018-01-11 → 2018-02-08 | 13% (< X) | F04 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E06 | 2018-02-16 → 2018-03-28 | 13% (< X) | F04 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XME-E07 | 2018-06-06 → 2018-12-24 | 35% | F05 | captured (dip) | $8,571 | 67% | 67% | 33% | 0% | 0% | $2,476 [−$4,336, $7,735] | 2 |
| XME-E08 | 2019-02-20 → 2019-05-31 | 23% (< X) | F05 | captured (dip) | $5,433 | 55% | 55% | 45% | 0% | 0% | $594 [−$6,349, $5,296] | 2 |
| XME-E09 | 2019-07-24 → 2019-08-15 | 15% (< X) | F06 | captured (dip) | $10,018 | 81% | 81% | 19% | 0% | 0% | $3,149 [−$1,586, $9,809] | 0 |
| XME-E10 | 2019-09-16 → 2019-10-02 | 10% (< X) | F06 | captured (dip) | $4,884 | 46% | 46% | 0% | 15% | 39% | $0 [$0, $4,509] | 0 |
| XME-E11 | 2019-12-12 → 2020-03-23 | 52% | F07 | captured (dip) | $29,736 | 41% | 41% | 59% | 0% | 0% | −$5,300 [−$22,240, $25,460] | 1 |
| XME-E12 | 2020-05-08 → 2020-05-13 | 11% (< X) | F07 | captured (dip) | $2,200 | 100% | 100% | 0% | 0% | 0% | $2,046 [$1,084, $2,905] | 0 |
| XME-E13 | 2020-06-08 → 2020-06-26 | 15% (< X) | F07 | captured (dip) | $7,795 | 81% | 39% | 19% | 0% | 0% | $3,697 [−$1,933, $8,152] | 1 |
| XME-E14 | 2020-09-18 → 2020-09-23 | 11% (< X) | F08 | captured (dip) | $2,424 | 84% | 84% | 11% | 0% | 5% | $1,377 [−$64, $2,475] | 0 |
| XME-E15 | 2021-01-06 → 2021-01-29 | 13% (< X) | F08 | captured (dip) | $2,713 | 87% | 87% | 0% | 0% | 13% | $2,713 [$0, $4,077] | 0 |
| XME-E16 | 2021-03-11 → 2021-03-24 | 12% (< X) | F08 | captured (dip) | $7,094 | 65% | 65% | 0% | 0% | 35% | $5,759 [$0, $7,509] | 0 |
| XME-E17 | 2021-06-01 → 2021-07-19 | 17% (< X) | F09 | captured (dip) | $12,011 | 86% | 86% | 0% | 0% | 14% | $3,454 [$0, $12,090] | 19 |
| XME-E18 | 2021-08-11 → 2021-09-21 | 13% (< X) | F09 | captured (dip) | $3,141 | 48% | 48% | 0% | 0% | 52% | $0 [$0, $3,152] | 1 |
| XME-E19 | 2021-11-12 → 2021-12-01 | 15% (< X) | F09 | entered, loss | −$774 | 3% | 3% | 83% | 0% | 14% | −$578 [−$1,186, $0] | 0 |
| XME-E20 | 2022-01-12 → 2022-01-27 | 14% (< X) | F10 | not armed | — | 3% | 3% | 0% | 0% | 97% | $0 [$0, $0] | 0 |
| XME-E21 | 2022-04-14 → 2022-05-12 | 26% | F10 | captured (dip) | $4,222 | 68% | 68% | 32% | 0% | 0% | $2,042 [−$602, $4,546] | 0 |
| XME-E22 | 2022-06-07 → 2022-07-06 | 28% | F10 | captured (dip) | $5,600 | 55% | 54% | 45% | 0% | 0% | $1,164 [−$6,943, $8,575] | 1 |
| XME-E23 | 2022-08-25 → 2022-09-26 | 23% | F11 | captured | $3,905 | 54% | 15% | 46% | 0% | 0% | $351 [−$5,057, $5,529] | 0 |
| XME-E24 | 2022-12-02 → 2022-12-19 | 11% (< X) | F11 | captured (dip) | $8,357 | 55% | 55% | 9% | 5% | 31% | $2,228 [$0, $8,175] | 3 |
| XME-E25 | 2023-03-03 → 2023-05-31 | 25% | F12 | captured (dip) | $3,646 | 100% | 100% | 0% | 0% | 0% | $5,369 [$3,277, $8,552] | 0 |

### GDX:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GDX-E08 | 2017-06-06 → 2017-07-07 | 11% (< X) | F03 | captured (dip) | $1,833 | 63% | 63% | 14% | 0% | 23% | $1,973 [−$1,634, $5,367] | 0 |
| GDX-E09 | 2017-09-07 → 2017-12-12 | 16% (< X) | F04 | entered, loss | −$235 | 1% | 1% | 63% | 0% | 37% | −$235 [−$884, $0] | 5 |
| GDX-E10 | 2018-01-24 → 2018-09-11 | 29% | F05 | captured (dip) | $21,051 | 96% | 96% | 4% | 0% | 0% | $18,357 [$4,560, $22,507] | 13 |
| GDX-E11 | 2019-02-20 → 2019-05-02 | 14% (< X) | F06 | entered, loss | −$1,967 | 2% | 2% | 94% | 0% | 4% | −$1,042 [−$1,877, −$56] | 12 |
| GDX-E12 | 2019-09-04 → 2019-09-13 | 14% (< X) | F06 | not armed | — | 0% | 0% | 2% | 0% | 98% | $0 [$0, $0] | 3 |
| GDX-E13 | 2019-09-24 → 2019-10-15 | 11% (< X) | F06 | not armed | — | 0% | 0% | 0% | 1% | 99% | $0 [$0, $0] | — |
| GDX-E14 | 2020-02-24 → 2020-02-28 | 16% (< X) | F07 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| GDX-E15 | 2020-03-05 → 2020-03-13 | 36% | F07 | captured (dip) | $39,651 | 100% | 100% | 0% | 0% | 0% | $39,561 [$37,275, $42,075] | 0 |
| GDX-E16 | 2020-03-17 → 2020-03-20 | 18% (< X) | F07 | captured (dip) | $29,630 | 100% | 100% | 0% | 0% | 0% | $28,481 [$26,598, $29,667] | 0 |
| GDX-E17 | 2020-03-25 → 2020-03-31 | 12% (< X) | F07 | captured (dip) | $25,830 | 80% | 80% | 20% | 0% | 0% | $25,551 [−$1,474, $26,233] | 0 |
| GDX-E18 | 2020-05-19 → 2020-06-18 | 13% (< X) | F07 | entered, loss | −$1,224 | 2% | 2% | 79% | 0% | 20% | −$1,224 [−$3,301, $0] | 5 |
| GDX-E19 | 2020-08-05 → 2020-08-11 | 12% (< X) | F07 | not armed | — | 1% | 1% | 1% | 0% | 98% | $0 [$0, $0] | 1 |
| GDX-E20 | 2020-08-17 → 2020-10-28 | 15% (< X) | F08 | not armed | — | 0% | 0% | 1% | 0% | 99% | $0 [$0, $0] | 0 |
| GDX-E21 | 2020-11-06 → 2020-11-24 | 19% (< X) | F08 | not armed | — | 14% | 14% | 9% | 0% | 77% | $0 [$0, $2,764] | 0 |
| GDX-E22 | 2021-01-04 → 2021-03-01 | 20% (< X) | F08 | captured (dip) | $9,533 | 88% | 88% | 12% | 0% | 0% | $7,398 [−$1,939, $11,050] | 1 |
| GDX-E23 | 2021-05-17 → 2021-09-29 | 27% (< X) | F09 | captured (dip) | $2,783 | 32% | 32% | 66% | 0% | 2% | −$1,447 [−$8,189, $3,581] | 0 |
| GDX-E24 | 2021-11-15 → 2021-12-15 | 15% (< X) | F09 | entered, loss | −$1,206 | 22% | 22% | 62% | 0% | 16% | −$655 [−$2,683, $1,286] | 2 |
| GDX-E25 | 2022-01-19 → 2022-01-28 | 11% (< X) | F09 | captured (dip) | $24,593 | 44% | 44% | 19% | 0% | 38% | $0 [−$4,438, $24,507] | 4 |
| GDX-E26 | 2022-04-18 → 2022-05-12 | 26% (< X) | F10 | entered, loss | −$1,964 | 68% | 68% | 23% | 0% | 9% | $869 [−$2,439, $3,005] | 13 |
| GDX-E27 | 2022-06-02 → 2022-07-25 | 26% (< X) | F10 | entered, loss | −$2,531 | 0% | 0% | 100% | 0% | 0% | −$10,412 [−$15,865, −$3,361] | 0 |
| GDX-E28 | 2022-08-12 → 2022-09-01 | 15% (< X) | F10 | entered, loss | −$5,403 | 0% | 0% | 100% | 0% | 0% | −$7,295 [−$13,438, −$3,593] | 1 |
| GDX-E29 | 2022-09-12 → 2022-09-26 | 14% (< X) | F10 | captured (dip) | $4,648 | 86% | 86% | 14% | 0% | 0% | $4,410 [−$779, $5,241] | 0 |
| GDX-E30 | 2022-10-04 → 2022-10-14 | 12% (< X) | F10 | captured (dip) | $13,372 | 100% | 92% | 0% | 0% | 0% | $13,861 [$4,591, $17,629] | 0 |
| GDX-E31 | 2023-01-25 → 2023-03-09 | 20% (< X) | F11 | captured (dip) | $6,170 | 63% | 63% | 37% | 0% | 0% | $8,293 [−$7,319, $14,189] | 3 |
| GDX-E32 | 2023-04-13 → 2023-07-06 | 19% (< X) | F11 | entered, loss | −$2,312 | 0% | 0% | 63% | 0% | 37% | −$1,014 [−$5,663, $0] | 1 |
| GDX-E33 | 2023-07-18 → 2023-10-04 | 21% (< X) | F12 | captured (dip) | $3,437 | 78% | 79% | 22% | 0% | 0% | $3,090 [−$619, $5,806] | 0 |

### GDX:alternative-1

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GDX-E08 | 2017-06-06 → 2017-07-07 | 11% (< X) | F03 | not armed | — | 32% | 32% | 16% | 0% | 52% | $0 [−$2,012, $4,049] | 0 |
| GDX-E09 | 2017-09-07 → 2017-12-12 | 16% (< X) | F04 | not armed | — | 0% | 0% | 33% | 0% | 67% | $0 [−$739, $0] | 0 |
| GDX-E10 | 2018-01-24 → 2018-09-11 | 29% | F05 | captured (dip) | $21,051 | 93% | 93% | 7% | 0% | 0% | $18,915 [$2,666, $22,501] | 2 |
| GDX-E11 | 2019-02-20 → 2019-05-02 | 14% (< X) | F06 | entered, loss | −$1,042 | 1% | 1% | 81% | 0% | 18% | −$770 [−$1,420, $0] | 1 |
| GDX-E12 | 2019-09-04 → 2019-09-13 | 14% (< X) | F06 | not armed | — | 0% | 0% | 1% | 0% | 99% | $0 [$0, $0] | 0 |
| GDX-E13 | 2019-09-24 → 2019-10-15 | 11% (< X) | F06 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| GDX-E14 | 2020-02-24 → 2020-02-28 | 16% (< X) | F07 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| GDX-E15 | 2020-03-05 → 2020-03-13 | 36% | F07 | captured (dip) | $39,651 | 100% | 100% | 0% | 0% | 0% | $39,561 [$37,275, $42,075] | 0 |
| GDX-E16 | 2020-03-17 → 2020-03-20 | 18% (< X) | F07 | captured (dip) | $29,630 | 100% | 100% | 0% | 0% | 0% | $28,481 [$26,598, $29,667] | 0 |
| GDX-E17 | 2020-03-25 → 2020-03-31 | 12% (< X) | F07 | captured (dip) | $25,830 | 75% | 75% | 25% | 0% | 0% | $25,264 [−$1,690, $25,830] | 0 |
| GDX-E18 | 2020-05-19 → 2020-06-18 | 13% (< X) | F07 | entered, loss | −$827 | 1% | 1% | 69% | 0% | 30% | −$635 [−$2,000, $0] | 6 |
| GDX-E19 | 2020-08-05 → 2020-08-11 | 12% (< X) | F07 | not armed | — | 0% | 0% | 1% | 0% | 99% | $0 [$0, $0] | 0 |
| GDX-E20 | 2020-08-17 → 2020-10-28 | 15% (< X) | F08 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| GDX-E21 | 2020-11-06 → 2020-11-24 | 19% (< X) | F08 | not armed | — | 12% | 12% | 12% | 0% | 77% | $0 [−$294, $2,147] | 0 |
| GDX-E22 | 2021-01-04 → 2021-03-01 | 20% (< X) | F08 | captured (dip) | $7,409 | 88% | 88% | 13% | 0% | 0% | $6,378 [−$562, $10,994] | 1 |
| GDX-E23 | 2021-05-17 → 2021-09-29 | 27% (< X) | F09 | entered, loss | −$2,674 | 38% | 38% | 60% | 0% | 2% | −$762 [−$4,072, $4,317] | 2 |
| GDX-E24 | 2021-11-15 → 2021-12-15 | 15% (< X) | F09 | not armed | — | 34% | 34% | 34% | 0% | 32% | $0 [−$1,787, $1,474] | 12 |
| GDX-E25 | 2022-01-19 → 2022-01-28 | 11% (< X) | F09 | captured (dip) | $24,593 | 40% | 40% | 22% | 1% | 38% | $0 [−$4,438, $24,357] | 4 |
| GDX-E26 | 2022-04-18 → 2022-05-12 | 26% (< X) | F10 | entered, loss | −$1,964 | 80% | 80% | 11% | 0% | 9% | $1,124 [−$531, $3,005] | 0 |
| GDX-E27 | 2022-06-02 → 2022-07-25 | 26% (< X) | F10 | entered, loss | −$2,180 | 0% | 0% | 100% | 0% | 0% | −$9,482 [−$17,014, −$5,549] | 1 |
| GDX-E28 | 2022-08-12 → 2022-09-01 | 15% (< X) | F10 | entered, loss | −$8,379 | 0% | 0% | 100% | 0% | 0% | −$6,763 [−$10,704, −$3,579] | 1 |
| GDX-E29 | 2022-09-12 → 2022-09-26 | 14% (< X) | F10 | captured (dip) | $4,648 | 72% | 72% | 28% | 0% | 0% | $4,336 [−$1,598, $5,177] | 0 |
| GDX-E30 | 2022-10-04 → 2022-10-14 | 12% (< X) | F10 | captured (dip) | $14,873 | 100% | 72% | 0% | 0% | 0% | $13,936 [$6,058, $17,761] | 0 |
| GDX-E31 | 2023-01-25 → 2023-03-09 | 20% (< X) | F11 | entered, loss | −$1,717 | 34% | 34% | 63% | 0% | 3% | −$1,688 [−$6,326, $13,854] | 4 |
| GDX-E32 | 2023-04-13 → 2023-07-06 | 19% (< X) | F11 | not armed | — | 0% | 0% | 34% | 0% | 66% | $0 [−$1,681, $0] | 2 |
| GDX-E33 | 2023-07-18 → 2023-10-04 | 21% (< X) | F12 | captured (dip) | $3,437 | 77% | 77% | 23% | 0% | 0% | $2,092 [−$619, $5,385] | 0 |

### KBE:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| KBE-E03 | 2017-03-01 → 2017-09-07 | 14% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| KBE-E04 | 2018-03-09 → 2018-12-24 | 32% | F03 | captured (dip) | $19,991 | 100% | 100% | 0% | 0% | 0% | $18,653 [$14,388, $20,460] | 0 |
| KBE-E05 | 2019-02-20 → 2019-03-25 | 12% (< X) | F03 | captured (dip) | $5,245 | 66% | 66% | 34% | 0% | 0% | $4,523 [−$1,984, $5,816] | 8 |
| KBE-E06 | 2019-05-03 → 2019-08-27 | 14% (< X) | F04 | entered, loss | −$237 | 1% | 1% | 65% | 0% | 34% | −$411 [−$1,759, $0] | 12 |
| KBE-E07 | 2019-12-17 → 2020-03-12 | 42% | F05 | entered, loss | −$17,568 | 0% | 0% | 100% | 0% | 0% | −$17,568 [−$27,225, −$7,182] | 1 |
| KBE-E08 | 2020-03-13 → 2020-03-23 | 26% | F05 | captured (dip) | $22,663 | 80% | 80% | 20% | 0% | 0% | $16,102 [−$8,446, $22,691] | 1 |
| KBE-E09 | 2020-03-26 → 2020-04-03 | 15% (< X) | F05 | entered, loss | −$7,020 | 21% | 11% | 79% | 0% | 0% | −$1,620 [−$6,791, $3,050] | 0 |
| KBE-E10 | 2020-04-09 → 2020-04-16 | 15% (< X) | F05 | captured (dip) | $12,236 | 100% | 85% | 0% | 0% | 0% | $11,924 [$6,702, $13,754] | 0 |
| KBE-E11 | 2020-04-29 → 2020-05-13 | 20% (< X) | F05 | captured (dip) | $14,999 | 100% | 100% | 0% | 0% | 0% | $14,540 [$10,219, $19,139] | 1 |
| KBE-E12 | 2020-06-08 → 2020-07-09 | 25% (< X) | F05 | entered, loss | −$8,876 | 0% | 0% | 100% | 0% | 0% | −$13,769 [−$23,751, −$5,736] | 1 |
| KBE-E13 | 2020-08-11 → 2020-09-23 | 17% (< X) | F06 | captured (dip) | $6,738 | 52% | 41% | 48% | 0% | 0% | $94 [−$8,068, $8,147] | 6 |
| KBE-E14 | 2021-06-01 → 2021-07-19 | 15% (< X) | F07 | not armed | — | 0% | 0% | 3% | 1% | 96% | $0 [$0, $0] | 2 |
| KBE-E15 | 2021-11-03 → 2021-12-20 | 11% (< X) | F07 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| KBE-E16 | 2022-01-14 → 2022-06-16 | 29% | F08 | captured (dip) | $8,720 | 96% | 96% | 4% | 0% | 0% | $8,093 [$3,755, $12,400] | 0 |
| KBE-E17 | 2022-08-16 → 2022-09-30 | 15% (< X) | F08 | captured (dip) | $2,173 | 49% | 49% | 51% | 0% | 0% | −$41 [−$2,672, $4,148] | 3 |
| KBE-E18 | 2022-11-10 → 2022-12-19 | 12% (< X) | F09 | entered, loss | −$291 | 6% | 6% | 66% | 5% | 23% | −$637 [−$8,067, $0] | 2 |
| KBE-E19 | 2023-02-07 → 2023-05-04 | 37% | F09 | captured (dip) | $14,217 | 55% | 55% | 45% | 0% | 0% | $1,577 [−$12,059, $14,680] | 0 |
| KBE-E20 | 2023-08-07 → 2023-10-25 | 18% (< X) | F10 | captured (dip) | $8,231 | 87% | 87% | 13% | 0% | 0% | $12,501 [−$3,269, $21,319] | 0 |

### KBE:alternative-1

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| KBE-E03 | 2017-03-01 → 2017-09-07 | 14% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| KBE-E04 | 2018-03-09 → 2018-12-24 | 32% | F03 | captured (dip) | $15,281 | 87% | 87% | 13% | 0% | 0% | $11,616 [−$603, $15,438] | 1 |
| KBE-E05 | 2019-02-20 → 2019-03-25 | 12% (< X) | F03 | captured (dip) | $5,977 | 74% | 74% | 13% | 0% | 13% | $3,516 [−$101, $6,424] | 1 |
| KBE-E06 | 2019-05-03 → 2019-08-27 | 14% (< X) | F04 | captured (dip) | $31 | 24% | 24% | 46% | 4% | 26% | $0 [−$3,255, $1,102] | 1 |
| KBE-E07 | 2019-12-17 → 2020-03-12 | 42% | F05 | entered, loss | −$24,232 | 0% | 0% | 100% | 0% | 0% | −$24,232 [−$24,232, −$17,346] | 0 |
| KBE-E08 | 2020-03-13 → 2020-03-23 | 26% (< X) | F05 | captured (dip) | $11,386 | 98% | 98% | 2% | 0% | 0% | $4,582 [$249, $11,386] | 2 |
| KBE-E09 | 2020-03-26 → 2020-04-03 | 15% (< X) | F05 | entered, loss (dip) | −$7,640 | 62% | 100% | 38% | 0% | 0% | $2,894 [−$7,585, $9,781] | 0 |
| KBE-E10 | 2020-04-09 → 2020-04-16 | 15% (< X) | F05 | captured (dip) | $13,223 | 63% | 50% | 37% | 0% | 0% | $3,824 [−$12,774, $16,273] | 5 |
| KBE-E11 | 2020-04-29 → 2020-05-13 | 20% (< X) | F05 | captured (dip) | $12,784 | 84% | 69% | 16% | 0% | 0% | $2,130 [−$333, $12,469] | 0 |
| KBE-E12 | 2020-06-08 → 2020-07-09 | 25% (< X) | F05 | entered, loss | −$4,897 | 16% | 16% | 84% | 0% | 0% | −$3,712 [−$9,656, $947] | 0 |
| KBE-E13 | 2020-08-11 → 2020-09-23 | 17% (< X) | F06 | captured (dip) | $3,369 | 70% | 23% | 30% | 0% | 0% | $2,536 [−$3,809, $5,338] | 0 |
| KBE-E14 | 2021-06-01 → 2021-07-19 | 15% (< X) | F07 | captured (dip) | $10,821 | 1% | 1% | 1% | 0% | 98% | $0 [$0, $0] | 0 |
| KBE-E15 | 2021-11-03 → 2021-12-20 | 11% (< X) | F07 | entered, loss | −$566 | 0% | 0% | 1% | 0% | 99% | $0 [$0, $0] | 0 |
| KBE-E16 | 2022-01-14 → 2022-06-16 | 29% | F08 | captured (dip) | $11,173 | 97% | 97% | 3% | 0% | 0% | $13,166 [$9,378, $17,774] | 21 |
| KBE-E17 | 2022-08-16 → 2022-09-30 | 15% (< X) | F08 | captured (dip) | $8,803 | 91% | 91% | 9% | 0% | 1% | $5,201 [$591, $9,134] | 2 |
| KBE-E18 | 2022-11-10 → 2022-12-19 | 12% (< X) | F09 | entered, loss | −$6,240 | 2% | 2% | 80% | 0% | 17% | −$5,406 [−$6,815, $0] | 1 |
| KBE-E19 | 2023-02-07 → 2023-05-04 | 37% | F09 | captured (dip) | $10,081 | 68% | 68% | 32% | 0% | 0% | $4,546 [−$16,629, $13,861] | 0 |
| KBE-E20 | 2023-08-07 → 2023-10-25 | 18% (< X) | F10 | captured (dip) | $19,515 | 80% | 80% | 20% | 0% | 0% | $18,817 [−$2,060, $23,505] | 2 |

### SLV:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| SLV-E03 | 2017-04-13 → 2017-07-07 | 16% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| SLV-E04 | 2017-09-07 → 2017-12-11 | 13% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| SLV-E05 | 2018-01-24 → 2018-11-13 | 21% (< X) | F04 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| SLV-E06 | 2019-02-20 → 2019-05-28 | 11% (< X) | F05 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| SLV-E07 | 2019-09-04 → 2019-12-06 | 16% (< X) | F06 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| SLV-E08 | 2020-02-24 → 2020-03-18 | 36% | F06 | captured (dip) | $48,845 | 100% | 100% | 0% | 0% | 0% | $39,458 [$20,534, $55,411] | 0 |
| SLV-E09 | 2020-08-10 → 2020-08-11 | 14% (< X) | F07 | captured (dip) | $3,224 | 50% | 50% | 0% | 14% | 36% | $1,384 [$0, $5,869] | 1 |
| SLV-E10 | 2020-08-31 → 2020-09-23 | 19% (< X) | F07 | captured (dip) | $6,987 | 37% | 37% | 63% | 0% | 0% | −$1,005 [−$11,953, $6,552] | 12 |
| SLV-E11 | 2020-11-06 → 2020-11-27 | 12% (< X) | F07 | captured (dip) | $1,873 | 96% | 96% | 4% | 0% | 0% | $1,873 [$923, $2,602] | 0 |
| SLV-E12 | 2021-01-05 → 2021-01-15 | 11% (< X) | F07 | captured (dip) | $7,496 | 70% | 70% | 13% | 13% | 4% | $7,023 [−$273, $8,020] | 2 |
| SLV-E13 | 2021-02-01 → 2021-03-30 | 17% (< X) | F08 | entered, loss | −$3,858 | 0% | 0% | 70% | 0% | 30% | −$3,353 [−$6,788, $0] | 0 |
| SLV-E14 | 2021-05-17 → 2021-09-29 | 24% | F09 | captured (dip) | $9,602 | 94% | 94% | 6% | 0% | 0% | $6,062 [$1,120, $9,158] | 1 |
| SLV-E15 | 2021-11-12 → 2021-12-09 | 13% (< X) | F09 | entered, loss | −$1,943 | 41% | 41% | 59% | 0% | 0% | −$665 [−$1,943, $8,329] | 1 |
| SLV-E16 | 2022-03-08 → 2022-07-25 | 31% | F10 | captured (dip) | $3,393 | 39% | 39% | 61% | 0% | 0% | −$6,778 [−$18,652, $4,176] | 42 |
| SLV-E17 | 2022-08-12 → 2022-09-01 | 15% (< X) | F10 | captured (dip) | $8,513 | 98% | 88% | 2% | 0% | 0% | $7,403 [$3,582, $9,503] | 3 |
| SLV-E18 | 2022-10-04 → 2022-10-14 | 13% (< X) | F10 | captured (dip) | $2,494 | 63% | 62% | 37% | 0% | 1% | $3,697 [−$498, $7,160] | 0 |
| SLV-E19 | 2023-01-13 → 2023-03-08 | 18% (< X) | F11 | in position | — | 1% | 1% | 11% | 37% | 52% | $0 [−$320, $0] | 1 |
| SLV-E20 | 2023-05-04 → 2023-06-22 | 14% (< X) | F11 | not armed | — | 0% | 0% | 0% | 1% | 99% | $0 [$0, $0] | — |
| SLV-E21 | 2023-07-19 → 2023-08-16 | 11% (< X) | F11 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| SLV-E22 | 2023-08-29 → 2023-10-05 | 15% (< X) | F12 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| SLV-E23 | 2023-12-01 → 2023-12-12 | 11% (< X) | F12 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |

### FXI:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| FXI-E04 | 2018-01-26 → 2018-10-29 | 29% | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| FXI-E05 | 2018-12-03 → 2019-01-03 | 11% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| FXI-E06 | 2019-04-05 → 2019-08-14 | 18% (< X) | F04 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| FXI-E07 | 2020-01-13 → 2020-03-18 | 25% (< X) | F05 | captured (dip) | $21,355 | 81% | 81% | 0% | 0% | 19% | $20,524 [$0, $22,026] | 2 |
| FXI-E08 | 2020-07-08 → 2020-09-25 | 11% (< X) | F06 | in position | — | 0% | 0% | 0% | 81% | 19% | $0 [$0, $0] | — |
| FXI-E09 | 2021-02-17 → 2021-10-04 | 31% | F07 | not armed | — | 0% | 0% | 11% | 0% | 89% | $0 [−$105, $0] | 1 |
| FXI-E10 | 2021-10-25 → 2022-01-05 | 17% (< X) | F07 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| FXI-E11 | 2022-01-20 → 2022-03-15 | 31% | F07 | captured (dip) | $13,648 | 100% | 100% | 0% | 0% | 0% | $13,235 [$12,223, $14,079] | 0 |
| FXI-E12 | 2022-04-04 → 2022-04-26 | 17% (< X) | F08 | captured (dip) | $1,088 | 54% | 54% | 20% | 26% | 0% | $349 [−$1,260, $1,788] | 1 |
| FXI-E13 | 2022-05-04 → 2022-05-09 | 12% (< X) | F08 | captured (dip) | $10,705 | 63% | 63% | 0% | 20% | 17% | $9,497 [$0, $11,216] | 0 |
| FXI-E14 | 2022-06-08 → 2022-10-31 | 39% | F09 | captured (dip) | $39,395 | 89% | 89% | 11% | 0% | 0% | $20,172 [−$105, $37,555] | 16 |
| FXI-E15 | 2023-01-26 → 2023-05-31 | 22% (< X) | F10 | captured (dip) | $3,938 | 57% | 57% | 41% | 0% | 2% | $631 [−$1,709, $3,834] | 65 |
| FXI-E16 | 2023-07-31 → 2023-12-20 | 25% (< X) | F11 | entered, loss | −$956 | 0% | 0% | 57% | 0% | 43% | −$366 [−$1,219, $0] | 11 |

### FXI:alternative-1

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| FXI-E04 | 2018-01-26 → 2018-10-29 | 29% | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| FXI-E05 | 2018-12-03 → 2019-01-03 | 11% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| FXI-E06 | 2019-04-05 → 2019-08-14 | 18% (< X) | F04 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| FXI-E07 | 2020-01-13 → 2020-03-18 | 25% (< X) | F05 | captured (dip) | $22,213 | 62% | 62% | 0% | 0% | 38% | $20,841 [$0, $22,421] | 0 |
| FXI-E08 | 2020-07-08 → 2020-09-25 | 11% (< X) | F06 | captured (dip) | $10,151 | 48% | 48% | 0% | 14% | 38% | $0 [$0, $10,970] | 0 |
| FXI-E09 | 2021-02-17 → 2021-10-04 | 31% | F07 | entered, loss | −$2,221 | 0% | 0% | 52% | 0% | 48% | −$2,050 [−$3,504, $0] | 0 |
| FXI-E10 | 2021-10-25 → 2022-01-05 | 17% (< X) | F07 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| FXI-E11 | 2022-01-20 → 2022-03-15 | 31% | F07 | captured (dip) | $13,772 | 100% | 100% | 0% | 0% | 0% | $13,675 [$6,598, $14,439] | 0 |
| FXI-E12 | 2022-04-04 → 2022-04-26 | 17% (< X) | F08 | captured (dip) | $1,626 | 78% | 78% | 21% | 1% | 0% | $1,211 [−$3,310, $2,264] | 0 |
| FXI-E13 | 2022-05-04 → 2022-05-09 | 12% (< X) | F08 | captured (dip) | $11,298 | 59% | 59% | 0% | 41% | 0% | $9,168 [$0, $11,567] | 0 |
| FXI-E14 | 2022-06-08 → 2022-10-31 | 39% | F09 | captured (dip) | $31,600 | 82% | 82% | 18% | 0% | 0% | $20,276 [−$4,902, $36,836] | 2 |
| FXI-E15 | 2023-01-26 → 2023-05-31 | 22% (< X) | F10 | entered, loss | −$2,162 | 0% | 0% | 88% | 0% | 12% | −$3,432 [−$4,866, $0] | 5 |
| FXI-E16 | 2023-07-31 → 2023-12-20 | 25% (< X) | F11 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |

### IJH:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| IJH-E02 | 2018-08-29 → 2018-12-24 | 24% | F02 | captured (dip) | $20,560 | 63% | 66% | 4% | 0% | 34% | $1,304 [$0, $20,046] | 1 |
| IJH-E03 | 2020-02-20 → 2020-03-23 | 42% | F03 | captured (dip) | $32,353 | 98% | 98% | 2% | 0% | 0% | $7,340 [$1,943, $18,580] | 2 |
| IJH-E04 | 2020-06-08 → 2020-06-26 | 12% (< X) | F03 | captured (dip) | $469 | 56% | 56% | 44% | 0% | 0% | $528 [−$1,199, $1,580] | 0 |
| IJH-E05 | 2021-11-16 → 2022-03-07 | 14% (< X) | F04 | captured (dip) | $124 | 5% | 5% | 20% | 0% | 75% | $0 [−$1,474, $0] | 0 |
| IJH-E06 | 2022-03-29 → 2022-06-16 | 21% (< X) | F04 | captured (dip) | $16,007 | 93% | 93% | 3% | 0% | 4% | $3,535 [$715, $16,011] | 0 |
| IJH-E07 | 2022-08-16 → 2022-09-30 | 17% (< X) | F05 | captured (dip) | $3,077 | 28% | 28% | 64% | 0% | 8% | −$253 [−$2,295, $2,394] | 2 |
| IJH-E08 | 2023-02-02 → 2023-03-17 | 13% (< X) | F05 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| IJH-E09 | 2023-07-31 → 2023-10-27 | 15% (< X) | F06 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |

### IJH:alternative-1

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| IJH-E02 | 2018-08-29 → 2018-12-24 | 24% | F02 | captured (dip) | $10,300 | 100% | 100% | 0% | 0% | 0% | $8,520 [$4,449, $12,146] | 29 |
| IJH-E03 | 2020-02-20 → 2020-03-23 | 42% | F03 | captured (dip) | $25,850 | 79% | 57% | 21% | 0% | 0% | $5,726 [−$4,212, $20,540] | 0 |
| IJH-E04 | 2020-06-08 → 2020-06-26 | 12% (< X) | F03 | captured (dip) | $4,856 | 57% | 57% | 43% | 0% | 0% | $753 [−$10,049, $4,823] | 0 |
| IJH-E05 | 2021-11-16 → 2022-03-07 | 14% (< X) | F04 | captured (dip) | $12,186 | 100% | 100% | 0% | 0% | 0% | $7,825 [$3,414, $13,112] | 4 |
| IJH-E06 | 2022-03-29 → 2022-06-16 | 21% | F04 | captured (dip) | $2,547 | 84% | 84% | 16% | 0% | 0% | $3,153 [−$1,050, $6,841] | 5 |
| IJH-E07 | 2022-08-16 → 2022-09-30 | 17% | F05 | captured (dip) | $2,670 | 39% | 39% | 61% | 0% | 0% | −$1,899 [−$7,762, $4,811] | 2 |
| IJH-E08 | 2023-02-02 → 2023-03-17 | 13% (< X) | F05 | captured (dip) | $1,946 | 46% | 46% | 16% | 0% | 38% | $0 [−$1,147, $3,446] | 7 |
| IJH-E09 | 2023-07-31 → 2023-10-27 | 15% | F06 | captured (dip) | $15,519 | 91% | 91% | 9% | 0% | 0% | $14,791 [$113, $16,660] | 4 |

### XLB:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| XLB-E02 | 2018-01-26 → 2018-10-24 | 21% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XLB-E03 | 2018-11-07 → 2018-12-24 | 15% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XLB-E04 | 2019-12-31 → 2020-03-23 | 38% | F03 | captured (dip) | $41,677 | 100% | 100% | 0% | 0% | 0% | $40,909 [$14,624, $45,706] | 0 |
| XLB-E05 | 2021-05-17 → 2021-09-30 | 11% (< X) | F04 | in position | — | 0% | 0% | 2% | 2% | 96% | $0 [$0, $0] | 0 |
| XLB-E06 | 2021-12-31 → 2022-03-08 | 12% (< X) | F04 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XLB-E07 | 2022-04-20 → 2022-07-14 | 22% (< X) | F05 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| XLB-E08 | 2022-08-16 → 2022-09-26 | 17% (< X) | F05 | captured (dip) | $12,897 | 91% | 91% | 0% | 0% | 9% | $9,970 [$4,098, $14,532] | 0 |
| XLB-E09 | 2023-02-01 → 2023-05-31 | 12% (< X) | F06 | not armed | — | 8% | 8% | 51% | 0% | 41% | −$41 [−$2,899, $0] | 11 |
| XLB-E10 | 2023-07-31 → 2023-10-23 | 13% (< X) | F06 | not armed | — | 0% | 0% | 2% | 0% | 98% | $0 [$0, $0] | 1 |

### MTUM:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MTUM-E02 | 2018-01-26 → 2018-02-08 | 10% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| MTUM-E03 | 2018-10-01 → 2018-12-24 | 22% | F03 | captured (dip) | $19,207 | 100% | 100% | 0% | 0% | 0% | $13,361 [$893, $17,999] | 1 |
| MTUM-E04 | 2020-02-19 → 2020-03-23 | 34% | F04 | captured (dip) | $18,344 | 100% | 100% | 0% | 0% | 0% | $14,369 [$9,511, $19,111] | 9 |
| MTUM-E05 | 2020-09-02 → 2020-09-08 | 10% (< X) | F04 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| MTUM-E06 | 2021-02-12 → 2021-03-08 | 16% (< X) | F05 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| MTUM-E07 | 2021-11-03 → 2022-03-08 | 23% | F06 | captured (dip) | $21,642 | 100% | 100% | 0% | 0% | 0% | $12,722 [$6,048, $20,751] | 0 |
| MTUM-E08 | 2022-03-29 → 2022-06-17 | 25% | F06 | captured (dip) | $8,249 | 40% | 40% | 60% | 0% | 0% | −$2,012 [−$8,146, $3,226] | 5 |
| MTUM-E09 | 2022-08-25 → 2022-09-30 | 11% (< X) | F07 | in position | — | 0% | 0% | 0% | 60% | 40% | $0 [$0, $0] | — |
| MTUM-E10 | 2022-11-30 → 2023-03-17 | 13% (< X) | F07 | captured (dip) | $2,439 | 64% | 64% | 4% | 0% | 32% | $1,244 [$0, $2,864] | 2 |

### MTUM:alternative-1

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MTUM-E02 | 2018-01-26 → 2018-02-08 | 10% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| MTUM-E03 | 2018-10-01 → 2018-12-24 | 22% | F03 | captured (dip) | $17,602 | 71% | 71% | 29% | 0% | 0% | $2,969 [−$865, $17,867] | 2 |
| MTUM-E04 | 2020-02-19 → 2020-03-23 | 34% | F04 | captured (dip) | $18,867 | 91% | 91% | 9% | 0% | 0% | $14,569 [$6,578, $23,189] | 10 |
| MTUM-E05 | 2020-09-02 → 2020-09-08 | 10% (< X) | F04 | entered, loss | −$569 | 0% | 0% | 83% | 0% | 17% | −$1,764 [−$4,786, $0] | 1 |
| MTUM-E06 | 2021-02-12 → 2021-03-08 | 16% (< X) | F05 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| MTUM-E07 | 2021-11-03 → 2022-03-08 | 23% | F06 | captured (dip) | $16,545 | 97% | 97% | 3% | 0% | 0% | $11,710 [$3,659, $15,594] | 0 |
| MTUM-E08 | 2022-03-29 → 2022-06-17 | 25% | F06 | entered, loss | −$5,285 | 0% | 0% | 100% | 0% | 0% | −$8,087 [−$14,869, −$4,757] | 7 |
| MTUM-E09 | 2022-08-25 → 2022-09-30 | 11% (< X) | F07 | entered, loss | −$2,430 | 7% | 7% | 92% | 0% | 1% | −$2,143 [−$5,612, −$224] | 5 |
| MTUM-E10 | 2022-11-30 → 2023-03-17 | 13% (< X) | F07 | not armed | — | 0% | 0% | 10% | 0% | 90% | $0 [−$24, $0] | 2 |

### XHB:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| XHB-E03 | 2018-01-22 → 2018-10-29 | 31% | F03 | captured (dip) | $201 | 36% | 36% | 64% | 0% | 0% | −$256 [−$5,436, $457] | 0 |
| XHB-E04 | 2018-12-03 → 2018-12-24 | 15% (< X) | F03 | captured (dip) | $16,469 | 96% | 95% | 3% | 1% | 0% | $14,494 [$8,681, $16,624] | 0 |
| XHB-E05 | 2020-02-20 → 2020-03-23 | 50% | F04 | captured (dip) | $6,527 | 66% | 66% | 34% | 0% | 0% | $4,499 [−$12,850, $8,018] | 0 |
| XHB-E06 | 2020-03-26 → 2020-04-03 | 17% (< X) | F04 | captured (dip) | $14,366 | 61% | 48% | 0% | 39% | 0% | $8,327 [$0, $15,103] | 0 |
| XHB-E07 | 2021-05-07 → 2021-06-18 | 12% (< X) | F05 | entered, loss | −$4,665 | 0% | 0% | 46% | 0% | 54% | $0 [−$6,122, $0] | 2 |
| XHB-E08 | 2021-12-10 → 2022-06-16 | 40% | F06 | captured (dip) | $13,429 | 76% | 76% | 24% | 0% | 0% | $8,128 [−$6,775, $13,061] | 2 |
| XHB-E09 | 2022-08-16 → 2022-10-20 | 21% (< X) | F06 | captured (dip) | $8,751 | 29% | 13% | 71% | 0% | 0% | −$6,357 [−$13,160, $5,598] | 1 |
| XHB-E10 | 2023-02-02 → 2023-04-06 | 11% (< X) | F07 | captured (dip) | $14,275 | 34% | 34% | 23% | 0% | 44% | $0 [−$2,762, $13,956] | 13 |
| XHB-E11 | 2023-08-01 → 2023-10-25 | 18% (< X) | F08 | entered, loss | −$1,335 | 0% | 0% | 30% | 2% | 68% | $0 [−$1,598, $0] | 0 |

### EWW:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| EWW-E05 | 2017-08-25 → 2017-12-26 | 17% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EWW-E06 | 2018-04-17 → 2018-06-05 | 19% | F03 | captured (dip) | $7,432 | 69% | 69% | 31% | 0% | 0% | $2,672 [−$4,126, $9,783] | 11 |
| EWW-E07 | 2018-08-07 → 2018-11-26 | 29% | F04 | captured (dip) | $17,907 | 91% | 91% | 9% | 0% | 0% | $8,675 [$405, $16,967] | 3 |
| EWW-E08 | 2019-04-17 → 2019-08-14 | 19% (< X) | F05 | captured (dip) | $9,003 | 71% | 71% | 29% | 0% | 0% | $5,136 [−$3,881, $9,230] | 46 |
| EWW-E09 | 2020-01-17 → 2020-03-23 | 48% | F06 | captured (dip) | $8,165 | 33% | 33% | 67% | 0% | 0% | −$3,068 [−$17,046, $8,305] | 0 |
| EWW-E10 | 2020-03-26 → 2020-04-03 | 16% (< X) | F06 | captured | $3,913 | 100% | 49% | 0% | 0% | 0% | $7,832 [$3,149, $11,483] | 9 |
| EWW-E11 | 2020-06-08 → 2020-07-13 | 14% (< X) | F06 | captured | $12,205 | 56% | 63% | 44% | 0% | 0% | $413 [−$4,788, $11,384] | 14 |
| EWW-E12 | 2021-01-08 → 2021-01-29 | 11% (< X) | F07 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EWW-E13 | 2021-08-31 → 2021-11-26 | 13% (< X) | F08 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EWW-E14 | 2022-04-01 → 2022-05-09 | 14% (< X) | F08 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EWW-E15 | 2022-05-27 → 2022-09-26 | 18% (< X) | F09 | captured (dip) | $22,822 | 97% | 97% | 3% | 0% | 0% | $15,262 [$5,044, $19,663] | 1 |
| EWW-E16 | 2023-07-28 → 2023-10-24 | 19% (< X) | F10 | captured (dip) | $9,877 | 89% | 89% | 11% | 0% | 0% | $9,404 [−$1,419, $23,124] | 12 |

### EWW:alternative-1

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| EWW-E05 | 2017-08-25 → 2017-12-26 | 17% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EWW-E06 | 2018-04-17 → 2018-06-05 | 19% | F03 | captured (dip) | $374 | 41% | 41% | 59% | 0% | 0% | −$868 [−$3,901, $3,434] | 11 |
| EWW-E07 | 2018-08-07 → 2018-11-26 | 29% | F04 | captured (dip) | $22,668 | 98% | 98% | 2% | 0% | 0% | $17,455 [$8,380, $22,103] | 2 |
| EWW-E08 | 2019-04-17 → 2019-08-14 | 19% (< X) | F05 | captured (dip) | $10,855 | 70% | 70% | 30% | 0% | 0% | $5,459 [−$3,243, $10,814] | 46 |
| EWW-E09 | 2020-01-17 → 2020-03-23 | 48% | F06 | captured (dip) | $5,137 | 60% | 60% | 40% | 0% | 0% | $2,748 [−$13,666, $9,918] | 0 |
| EWW-E10 | 2020-03-26 → 2020-04-03 | 16% (< X) | F06 | captured (dip) | $7,027 | 97% | 52% | 3% | 0% | 0% | $6,854 [$2,832, $10,529] | 0 |
| EWW-E11 | 2020-06-08 → 2020-07-13 | 14% (< X) | F06 | captured (dip) | $8,491 | 70% | 65% | 30% | 0% | 0% | $2,645 [−$4,254, $12,307] | 14 |
| EWW-E12 | 2021-01-08 → 2021-01-29 | 11% (< X) | F07 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EWW-E13 | 2021-08-31 → 2021-11-26 | 13% (< X) | F08 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EWW-E14 | 2022-04-01 → 2022-05-09 | 14% (< X) | F08 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EWW-E15 | 2022-05-27 → 2022-09-26 | 18% (< X) | F09 | captured (dip) | $16,388 | 99% | 99% | 1% | 0% | 0% | $15,234 [$3,472, $20,113] | 1 |
| EWW-E16 | 2023-07-28 → 2023-10-24 | 19% (< X) | F10 | captured (dip) | $11,250 | 100% | 100% | 0% | 0% | 0% | $10,325 [$8,971, $11,962] | 12 |

### EDV:representative

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| EDV-E02 | 2017-12-15 → 2018-11-02 | 18% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EDV-E03 | 2019-08-28 → 2019-12-31 | 12% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EDV-E04 | 2020-03-09 → 2020-03-19 | 19% (< X) | F03 | captured (dip) | $16,644 | 100% | 100% | 0% | 0% | 0% | $12,786 [$9,984, $16,993] | 3 |
| EDV-E05 | 2020-04-21 → 2020-06-05 | 12% (< X) | F03 | captured (dip) | $3,275 | 78% | 78% | 22% | 0% | 0% | $2,736 [−$7,288, $5,639] | 1 |
| EDV-E06 | 2020-08-04 → 2021-03-18 | 30% | F04 | entered, loss | −$970 | 0% | 0% | 84% | 0% | 16% | −$2,178 [−$6,394, $0] | 14 |
| EDV-E07 | 2021-12-03 → 2022-06-14 | 37% | F05 | entered, loss | −$1,150 | 2% | 2% | 80% | 0% | 19% | −$1,962 [−$8,498, $0] | 12 |
| EDV-E08 | 2022-08-01 → 2022-10-24 | 29% | F05 | captured (dip) | $15,985 | 97% | 97% | 3% | 0% | 0% | $15,233 [$167, $16,481] | 0 |
| EDV-E09 | 2022-12-07 → 2022-12-28 | 13% (< X) | F06 | captured (dip) | $3,458 | 73% | 73% | 0% | 27% | 0% | $2,545 [$0, $4,149] | 1 |
| EDV-E10 | 2023-02-02 → 2023-03-02 | 10% (< X) | F06 | captured (dip) | $3,472 | 97% | 97% | 3% | 0% | 0% | $2,779 [$2,001, $3,782] | 1 |
| EDV-E11 | 2023-04-06 → 2023-10-19 | 32% | F07 | captured (dip) | $22,013 | 73% | 73% | 27% | 0% | 0% | $4,623 [−$4,726, $22,746] | 0 |

### EDV:alternative-1

| Episode | peak → trough | depth | family | base outcome | base net | joint captured | joint dip-captured | joint loss | joint in position | joint no entry | joint episode net median [P10, P90] | entry-offset IQR (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| EDV-E02 | 2017-12-15 → 2018-11-02 | 18% (< X) | F02 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EDV-E03 | 2019-08-28 → 2019-12-31 | 12% (< X) | F03 | not armed | — | 0% | 0% | 0% | 0% | 100% | $0 [$0, $0] | — |
| EDV-E04 | 2020-03-09 → 2020-03-19 | 19% (< X) | F03 | captured (dip) | $11,384 | 98% | 98% | 2% | 0% | 0% | $12,085 [$173, $16,023] | 0 |
| EDV-E05 | 2020-04-21 → 2020-06-05 | 12% (< X) | F03 | captured (dip) | $2,857 | 97% | 97% | 1% | 0% | 2% | $3,050 [$2,046, $6,640] | 1 |
| EDV-E06 | 2020-08-04 → 2021-03-18 | 30% | F04 | entered, loss | −$1,693 | 11% | 11% | 89% | 0% | 0% | −$2,154 [−$6,727, $31] | 19 |
| EDV-E07 | 2021-12-03 → 2022-06-14 | 37% | F05 | entered, loss | −$1,150 | 3% | 3% | 97% | 0% | 0% | −$6,084 [−$13,814, −$1,448] | 5 |
| EDV-E08 | 2022-08-01 → 2022-10-24 | 29% | F05 | captured (dip) | $16,908 | 67% | 67% | 33% | 0% | 0% | $4,601 [−$6,750, $12,255] | 26 |
| EDV-E09 | 2022-12-07 → 2022-12-28 | 13% (< X) | F06 | captured (dip) | $5,188 | 66% | 66% | 0% | 32% | 2% | $3,840 [$0, $6,369] | 2 |
| EDV-E10 | 2023-02-02 → 2023-03-02 | 10% (< X) | F06 | captured (dip) | $4,316 | 52% | 52% | 4% | 0% | 44% | $3,944 [$0, $4,316] | 0 |
| EDV-E11 | 2023-04-06 → 2023-10-19 | 32% | F07 | captured (dip) | $17,571 | 52% | 52% | 48% | 0% | 0% | $399 [−$10,187, $6,015] | 1 |
