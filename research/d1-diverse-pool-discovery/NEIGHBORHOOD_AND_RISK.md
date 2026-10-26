# Neighbourhood and risk: E0 centres versus E1 neighbourhoods, drawdowns, the second amplitude, independence

**Who this is for:** reviewers judging how robust the final finalists' training figures are, and how much the score
that selected them can be trusted. Everything is on the 2016-01-04 → 2023-12-29 training window (E0 = one point
estimate; E1 = an independently drawn neighbourhood on the same window). Nothing here is out of sample.

Sources: `results/rounds/final/select/<arm>/assessment.json` and `select/benchmarks.json` (same draws for
benchmarks); confirm-B: `results/confirmB/confirmB.json` (§4).

## 1. What each measure is

| Measure | Draws | Used for |
|---|---|---|
| E0 centre | the configuration itself, fixed pool, 5 bps | F1, G2, G5's centre tails, reporting |
| E1 confirm-A, class N1 (A1 amplitude u) | n = 256, CRN shared across finalists and benchmarks | the final score S, gates G3–G7, ranking |
| A2 (amplitude 2u) | n = 128 | sensitivity, reported only |
| N2 (exactly 3 coordinates ±u) / N3 (one member at a time) | 64 / 8 per member | sensitivity, reported only |
| confirm-B | a fresh batch, never used by search, ranking, pruning or selection | independence check only (§4) |

Draw independence by construction:
- the search used `disc` draws;
- promotion `promo`, refinement `refine`, pruning `prune`;
- the gates and ranking used `confirm-A`;
- confirm-B is drawn after the selection is sealed.

Every batch has its own random stream (`seedLabels` in `src/d1-diverse/context.ts`).

## 2. Final finalists and the benchmarks on the same draws (fixed $100k pool, 5 bps; J's net)

Columns:
- "Feasible share": the share of draws with minute DD ≤ $35,000.
- ΔP50 vs B5: the paired confirm-A difference with its 90% bootstrap interval.
- Portfolio: the 20% portfolio, symmetric dividend convention; "B5 ladder" is B5's end equity interpolated at the
  candidate's borrowing dollar-days (G7).

| Arm | Finalist | Members | E0 centre net | E0 minute DD | E1 P50 net [90% CI] | E1 Q25 | E1 P50 net_T | DD median / DD90 | Feasible share A1 | A2 (2u) P50 / feasible | N2 P50 | ΔP50 vs B5 [90% CI] | Portfolio daily DD (sym.) | End equity / B5 ladder | Gates |
|---|---|---|---:|---:|---|---:|---:|---|---:|---|---:|---|---:|---|---|
| benchmark | B4 | KRE VGT XBI XRT | $242k | $29k | $128k [$126k, $132k] | $110k | $107k | $39k / $53k | 33% | $94k / 12% | $221k | — | 35% | $1,671k / — | reference |
| benchmark | B5 | GDX KRE VGT XBI XRT | $388k | $27k | $209k [$202k, $218k] | $171k | $145k | $38k / $53k | 32% | $148k / 16% | $365k | — | 30% | $2,263k / — | reference |
| J-u | J-u-f1 | EWW FXI GDX KBE XME | $379k | $25k | $349k [$346k, $351k] | $331k | $282k | $25k / $30k | 100% | $158k / 24% | $379k | $140k [$129k, $148k] | 27% | $2,225k / $2,467k | fail G7 |
| J-u | J-u-f2 | EWW FXI GDX SMH XME | $325k | $21k | $327k [$324k, $330k] | $302k | $253k | $22k / $34k | 90% | $147k / 52% | $325k | $119k [$108k, $126k] | 28% | $2,026k / $2,203k | fail G7 |
| J-u | J-u-f3 | EWW FXI GDX SMH XME | $340k | $22k | $324k [$319k, $326k] | $307k | $262k | $22k / $29k | 99% | $173k / 57% | $340k | $115k [$104k, $122k] | 29% | $2,052k / $2,241k | fail G7 |
| J-u | J-u-f4 | FXI GDX XHB | $188k | $24k | $266k [$264k, $268k] | $233k | $159k | $45k / $51k | 23% | $168k / 35% | $189k | $58k [$47k, $64k] | 33% | $1,571k / $1,731k | fail G7 |
| J-u | J-u-f5 | EWW FXI GDX SMH XME | $392k | $21k | $336k [$331k, $338k] | $318k | $271k | $21k / $29k | 97% | $163k / 52% | $392k | $127k [$116k, $134k] | 27% | $2,258k / $2,360k | fail G7 |
| J-u | J-u-f6 | EWW FXI GDX SMH XME | $374k | $22k | $321k [$316k, $325k] | $299k | $251k | $22k / $29k | 99% | $182k / 55% | $373k | $112k [$101k, $120k] | 29% | $2,175k / $2,348k | fail G7 |
| J-u | J-u-f7 | EWW FXI XLK XME | $231k | $23k | $205k [$202k, $208k] | $193k | $171k | $23k / $31k | 94% | $115k / 56% | $229k | −$3k [−$14k, $4k] | 34% | $1,632k / $1,971k | fail G6,G7 |
| J-u | J-u-f8 | EDV GDX SLV XLK | $275k | $18k | $234k [$227k, $238k] | $204k | $118k | $23k / $28k | 100% | $173k / 83% | $275k | $25k [$13k, $34k] | 34% | $1,789k / $2,049k | fail G6,G7 |
| T-u | T-u-f1 | EWW FXI KRE MTUM SLV XME | $341k | $26k | $286k [$283k, $289k] | $266k | $246k | $26k / $35k | 90% | $187k / 49% | $338k | $77k [$66k, $85k] | 32% | $1,941k / $2,383k | fail G7 |
| T-u | T-u-f2 | EWW GDX ILF VGT XBI | $272k | $22k | $257k [$254k, $260k] | $239k | $227k | $24k / $31k | 95% | $168k / 50% | $272k | $48k [$37k, $56k] | 28% | $1,827k / $2,173k | fail G7 |
| T-u | T-u-f3 | EWW GDX ILF VGT XBI | $278k | $24k | $258k [$256k, $261k] | $241k | $230k | $25k / $33k | 91% | $180k / 57% | $291k | $50k [$40k, $57k] | 28% | $1,846k / $2,227k | fail G7 |
| T-u | T-u-f4 | EWW SLV XME | $276k | $26k | $237k [$231k, $242k] | $216k | $178k | $25k / $34k | 98% | $168k / 58% | $275k | $28k [$16k, $37k] | 33% | $1,713k / $2,126k | fail G6,G7 |
| T-u | T-u-f5 | DBC GDX SLV SMH XBI | $224k | $25k | $275k [$272k, $278k] | $257k | $237k | $41k / $47k | 22% | $193k / 33% | $225k | $67k [$56k, $74k] | 32% | $1,684k / $2,014k | fail G7 |
| T-u | T-u-f6 | EWW FXI MTUM SLV XME | $338k | $25k | $273k [$269k, $276k] | $252k | $232k | $21k / $25k | 100% | $179k / 72% | $334k | $64k [$53k, $72k] | 32% | $1,927k / $2,326k | fail G7 |
| T-u | T-u-f7 | EWW FXI KRE MTUM SLV XME | $346k | $26k | $284k [$279k, $287k] | $262k | $238k | $22k / $28k | 100% | $183k / 41% | $344k | $75k [$63k, $82k] | 32% | $1,961k / $2,429k | fail G7 |
| J-s | J-s-f1 | GDX KRE XBI XRT | $373k | $31k | $312k [$309k, $318k] | $290k | $242k | $28k / $34k | 92% | $217k / 19% | $369k | $104k [$93k, $112k] | 30% | $2,191k / $2,116k | pass |
| J-s | J-s-f2 | GDX KRE XBI XRT | $335k | $31k | $314k [$309k, $321k] | $282k | $239k | $32k / $43k | 67% | $181k / 29% | $335k | $106k [$93k, $116k] | 30% | $2,047k / $1,908k | pass |
| J-s | J-s-f3 | GDX KRE XBI XRT | $399k | $34k | $313k [$306k, $319k] | $286k | $242k | $27k / $42k | 72% | $201k / 18% | $386k | $104k [$93k, $112k] | 29% | $2,298k / $2,211k | pass |
| J-s | J-s-f4 | GDX KRE XBI XRT | $319k | $31k | $291k [$289k, $296k] | $273k | $215k | $32k / $40k | 80% | $207k / 17% | $318k | $83k [$72k, $91k] | 29% | $1,992k / $1,979k | pass |
| J-s | J-s-f5 | GDX KRE XBI XRT | $398k | $23k | $302k [$298k, $308k] | $277k | $231k | $32k / $41k | 81% | $199k / 16% | $388k | $94k [$82k, $102k] | 29% | $2,303k / $2,207k | pass |
| J-s | J-s-f6 | GDX KRE VGT XBI XRT | $358k | $29k | $306k [$302k, $312k] | $281k | $222k | $35k / $38k | 46% | $183k / 22% | $354k | $98k [$86k, $107k] | 32% | $2,135k / $2,202k | fail G7 |
| J-s | J-s-f7 | FXI ILF IWN SLV | $188k | $32k | $183k [$182k, $184k] | $174k | $106k | $32k / $36k | 84% | $82k / 12% | $187k | −$26k [−$36k, −$19k] | 32% | $1,475k / $1,603k | fail G4,G6,G7 |
| J-s | J-s-f8 | EWW EWZ FXI GDX KRE VGT XME | $328k | $29k | $303k [$301k, $310k] | $283k | $205k | $32k / $45k | 68% | $179k / 35% | $326k | $94k [$84k, $104k] | 30% | $2,050k / $2,687k | fail G7 |
| T-s | T-s-f1 | GDX KRE VGT XBI XRT | $364k | $33k | $301k [$299k, $304k] | $276k | $248k | $34k / $43k | 58% | $177k / 17% | $359k | $93k [$82k, $101k] | 32% | $2,119k / $2,255k | fail G7 |
| T-s | T-s-f2 | DBC GDX KRE SMH VGT XRT | $339k | $33k | $301k [$296k, $308k] | $279k | $271k | $35k / $41k | 55% | $203k / 20% | $339k | $93k [$81k, $102k] | 30% | $2,045k / $2,451k | fail G7 |
| T-s | T-s-f3 | GDX KRE VGT XBI | $307k | $31k | $270k [$266k, $272k] | $252k | $238k | $33k / $35k | 88% | $192k / 45% | $301k | $62k [$51k, $68k] | 31% | $1,948k / $2,044k | fail G7 |
| T-s | T-s-f4 | GDX KRE VGT XBI XRT | $380k | $33k | $294k [$289k, $299k] | $276k | $238k | $33k / $42k | 72% | $193k / 27% | $375k | $86k [$74k, $95k] | 31% | $2,193k / $2,285k | fail G7 |
| T-s | T-s-f5 | GDX KRE VGT XBI XRT | $377k | $28k | $292k [$288k, $296k] | $269k | $242k | $35k / $38k | 50% | $196k / 31% | $371k | $83k [$72k, $91k] | 30% | $2,174k / $2,103k | pass |
| T-s | T-s-f7 | EWW FXI IWN SLV | $195k | $24k | $166k [$164k, $169k] | $146k | $141k | $24k / $31k | 90% | $115k / 46% | $193k | −$43k [−$53k, −$35k] | 32% | $1,572k / $2,120k | fail G6,G7 |
| T-s | T-s-f8 | GDX IWF IWN | $223k | $22k | $224k [$223k, $225k] | $215k | $187k | $22k / $23k | 97% | $173k / 48% | $224k | $15k [$5k, $22k] | 33% | $1,657k / $1,921k | fail G6,G7,G8 |

## 3. What the neighbourhoods say

1. **B5 is a sharp peak; the finalists are broad plateaus.**
   - B5's centre earns $388k, but its A1 neighbourhood median is $209k, and only 32% of its neighbours stay within the
     $35k drawdown limit. That is what a vector tuned on these years looks like.
   - The five unseeded J finalists of the EWW FXI GDX (SMH) XME region (J-u f1–f3, f5, f6) keep 90–100% of neighbours
     feasible, with medians of $321k–$349k. That is exactly what the J score was built to select.
   - Not every finalist is a plateau. J-u-f4 (FXI GDX XHB) and T-u-f5 keep only 22–23% of neighbours feasible: their
     medians exceed their centres. 84–90% of their neighbours earn more than the centre while funding fewer lots
     (median 23.5 and 42, against 31 and 65 at the centre), so the centre sits in a dip of a wider, riskier
     neighbourhood.
   - So on training, every unseeded J/T finalist except J-u-f7 beats B5 at the median, by $25k–$140k with intervals
     above zero.
2. **The plateau does not survive doubling the perturbation.** At amplitude 2u, medians fall to $82k–$217k for every
   finalist and for B4/B5, and feasible shares to 12–83%. B1, a single VGT book, is the exception: $67k with 100%
   feasible. A plateau one step wide is still a local feature of the
   training data.
3. **The fixed-pool advantage does not carry into the 20% portfolio.**
   - Every unseeded finalist ends below B5's borrowing ladder (G7): for the same borrowing dollar-days, B5's
     portfolio ends higher. J-u-f1, for example, ends at $2.23M against $2.47M.
   - Only B5 descendants from the seeded arms pass G7: J-s f1–f5 (GDX KRE XBI XRT, i.e. B5 without VGT) and T-s-f5
     (B5's members with re-tuned parameters).
   - The unseeded finalists also run at 27–34% portfolio daily drawdown, against B5's 30%.
4. **The temporal trim (net_T: the best block replaced by the median block) costs every configuration.**
   - T finalists lose less to it ($25k–$59k between P50 net and P50 net_T) than J finalists ($34k–$116k). That is by
     construction, since T ranks on net_T.
   - Both procedures still end up concentrated in the same few symbols (GDX, EWW, FXI, XME, KRE, SLV).
5. **Selection on confirm-A inflates confirm-A.** The finalists were ranked on these draws, so their confirm-A
   medians are optimistically biased. B4 and B5 were not selected on them. confirm-B (§4) measures how much of the
   gap survives a fresh batch.

## 4. Selection versus confirmation independence (confirm-B)

`confirm-b` ran once, at 10:49:13Z, after `FROZEN_SELECTION.json` was sealed. Its `manifestHash` equals the frozen
body `ae20e984…`, and it verified its inputs against the frozen record hashes first. It drew a fresh N1 batch of 256
for every final finalist, B1/B4/B5 and the inspect-only R1, R4 and October 25 finalist. Record:
`results/confirmB/confirmB.json` (`e4916bbb…`). It cannot change the selection.

| Row | Kind | E0 centre | confirm-A P50 | confirm-B P50 [90% CI] | B − A (P50) | B − A (P50 net_T) | Flagged (> 2 SE) | confirm-B DD median / DD90 |
|---|---|---:|---:|---|---:|---:|---|---|
| J-u-f1 | finalist (J-u) | $379k | $349k | $349k [$347k, $352k] | +$0.4k | −$1.3k | no | $25k / $30k |
| J-u-f2 | finalist (J-u) | $325k | $327k | $322k [$319k, $325k] | −$5.6k | +$0.5k | **yes** | $22k / $36k |
| J-u-f3 | finalist (J-u) | $340k | $324k | $322k [$318k, $326k] | −$2.1k | −$1.1k | no | $22k / $29k |
| J-u-f4 | finalist (J-u) | $188k | $266k | $266k [$263k, $268k] | +$0.3k | −$0.6k | no | $45k / $51k |
| J-u-f5 | finalist (J-u) | $392k | $336k | $334k [$332k, $338k] | −$1.9k | −$1.4k | no | $22k / $30k |
| J-u-f6 | finalist (J-u) | $374k | $321k | $320k [$315k, $323k] | −$1.3k | +$1.9k | no | $21k / $28k |
| J-u-f7 | finalist (J-u) | $231k | $205k | $211k [$208k, $214k] | +$5.5k | +$6.9k | **yes** | $23k / $31k |
| J-u-f8 | finalist (J-u) | $275k | $234k | $235k [$231k, $238k] | +$1.4k | −$1.0k | no | $23k / $30k |
| T-u-f1 | finalist (T-u) | $341k | $286k | $280k [$276k, $283k] | −$6.0k | −$1.8k | **yes** | $26k / $35k |
| T-u-f2 | finalist (T-u) | $272k | $257k | $258k [$254k, $261k] | +$1.4k | −$1.9k | no | $24k / $31k |
| T-u-f3 | finalist (T-u) | $278k | $258k | $259k [$254k, $262k] | +$1.3k | −$1.9k | no | $24k / $33k |
| T-u-f4 | finalist (T-u) | $276k | $237k | $242k [$238k, $246k] | +$5.1k | +$5.1k | no | $25k / $31k |
| T-u-f5 | finalist (T-u) | $224k | $275k | $276k [$272k, $278k] | +$0.5k | −$2.1k | no | $41k / $47k |
| T-u-f6 | finalist (T-u) | $338k | $273k | $270k [$267k, $275k] | −$2.2k | −$2.2k | no | $21k / $25k |
| T-u-f7 | finalist (T-u) | $346k | $284k | $276k [$273k, $281k] | −$7.1k | −$2.5k | **yes** | $21k / $27k |
| J-s-f1 | finalist (J-s) | $373k | $312k | $316k [$311k, $322k] | +$3.5k | +$8.4k | no | $28k / $34k |
| J-s-f2 | finalist (J-s) | $335k | $314k | $319k [$312k, $326k] | +$4.2k | +$4.0k | no | $30k / $39k |
| J-s-f3 | finalist (J-s) | $399k | $313k | $312k [$306k, $321k] | −$0.9k | +$1.4k | no | $26k / $38k |
| J-s-f4 | finalist (J-s) | $319k | $291k | $292k [$289k, $296k] | +$0.4k | +$3.3k | no | $31k / $45k |
| J-s-f5 | finalist (J-s) | $398k | $302k | $305k [$300k, $311k] | +$3.1k | +$4.5k | no | $32k / $43k |
| J-s-f6 | finalist (J-s) | $358k | $306k | $308k [$303k, $314k] | +$1.8k | +$6.2k | no | $35k / $38k |
| J-s-f7 | finalist (J-s) | $188k | $183k | $180k [$179k, $182k] | −$2.4k | −$1.9k | **yes** | $32k / $36k |
| J-s-f8 | finalist (J-s) | $328k | $303k | $307k [$302k, $310k] | +$3.8k | +$1.8k | no | $32k / $44k |
| T-s-f1 | finalist (T-s) | $364k | $301k | $303k [$297k, $306k] | +$1.5k | −$3.6k | no | $33k / $43k |
| T-s-f2 | finalist (T-s) | $339k | $301k | $299k [$294k, $302k] | −$2.4k | −$2.0k | no | $34k / $41k |
| T-s-f3 | finalist (T-s) | $307k | $270k | $264k [$260k, $266k] | −$6.1k | −$4.3k | **yes** | $33k / $35k |
| T-s-f4 | finalist (T-s) | $380k | $294k | $298k [$293k, $303k] | +$4.3k | +$3.4k | no | $33k / $41k |
| T-s-f5 | finalist (T-s) | $377k | $292k | $292k [$288k, $296k] | +$0.3k | +$2.0k | no | $35k / $38k |
| T-s-f7 | finalist (T-s) | $195k | $166k | $165k [$162k, $169k] | −$0.5k | +$2.9k | no | $24k / $47k |
| T-s-f8 | finalist (T-s) | $223k | $224k | $224k [$222k, $225k] | −$0.3k | −$0.8k | no | $22k / $25k |
| B1 | benchmark | $135k | $95k | $93k [$91k, $96k] | −$2.2k | −$1.0k | no | $21k / $27k |
| B4 | benchmark | $242k | $128k | $128k [$126k, $133k] | +$0.1k | −$2.8k | no | $40k / $52k |
| B5 | benchmark | $388k | $209k | $209k [$202k, $215k] | +$0.4k | +$2.3k | no | $37k / $53k |
| R1 | inspect-only | $468k | — | $262k [$255k, $269k] | — | — | — | $36k / $47k |
| R4 | inspect-only | $372k | — | $244k [$239k, $247k] | — | — | — | $36k / $52k |
| October 25 training finalist | inspect-only | $310k | — | $292k [$290k, $294k] | — | — | — | $35k / $41k |

What it shows:

1. **The ranking batch did not inflate the finalists' figures.** confirm-B reproduces confirm-A within −$7.1k to
   +$5.5k at the median, centred near zero. 6 of 33 paired rows differ by more than 2 pooled standard errors, in both
   directions. With 256 draws per batch, the winner's-curse from ranking 30 finalists on confirm-A is small.
2. **The optimism that matters is not on the draws but on the window.** Every finalist was found and ranked on the
   same 2016–2023 data. Training draws cannot reveal that. The walk-forward folds can, and they showed no
   persistence (`CHRONOLOGICAL_METHOD_COMPARISON.md`).
3. **The inspect-only references sit where earlier studies left them.** On these draws:
   - R1: $262k;
   - R4: $244k;
   - the October 25 training finalist: $292k;
   - B5: $209k;
   - B4: $128k.

   Their post-2023 records come from earlier studies and were not re-read here.
