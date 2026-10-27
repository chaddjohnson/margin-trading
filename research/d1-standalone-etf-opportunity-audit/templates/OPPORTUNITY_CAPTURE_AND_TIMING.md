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

{{ev.summary}}

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

{{ev.capture}}
