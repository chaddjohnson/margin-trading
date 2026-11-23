# Priority 4 — Stage A: fixed-parameter ablations of S1 on the incumbents (report-only)

Written analysis and tables only. Stage A (PROTOCOL.md §11) ran after the protocol freeze and before any search, as the
official GPU job `ablation` on D24 (the C24 training door, 2016-01-04 → 2024-12-31), 2026-11-23T18:17:25–18:17:45Z:
146 subjects × 4 frictions = **584 requested official GPU evaluations**, sealed in `results/ablation/ablation.json`
(commit `11a12b26`). Nothing here selects, ranks or narrows a search; the grid was fixed in the protocol.

## 1. What was evaluated

- **A0 (OFF identity check):** New L0 and N/original with S1 OFF reproduce their sealed D24 figures to the cent —
  New L0 net $382,721.46 / marked DD $19,459.83, N/original $388,031.02 / $19,459.83 (reference: Stage B's sealed C24
  qualification, sha256 `147880db…`). **PASS.**
- **Grid:** activation A ∈ {7.5, 12.5, 20, 30, 40} % × τ₂ = round(r × τ₁), r ∈ {0.30, 0.50, 0.70, 0.85}, on one book
  at a time (D1·GDX, D1·VGT, Growth·VGT) and on all three, for both incumbents: **160 points**.
- **Invalid points: 16** (never repaired) — every A = 7.5 % point that stages D1·VGT (alone or with the others), for both
  incumbents: D1·VGT's τ₁ is 7.3 %, so the no-early-lock minimum activation (RULE_SPECIFICATION D7) is 8.0 % and
  7.5 % fails it. **Duplicates: 0.** Valid points: **144**.
- **Frictions:** base; stop slippage +10 bps; stop slippage +25 bps; next-open stop fills (D1).

## 2. Results (complete shared-capital pool, D24)

| Friction | points with Δ net > 0 / = 0 / < 0 | best Δ net | median Δ net | worst Δ net | points with Δ net ≥ $10,000 |
|---|---|---|---|---|---|
| base | 10 / 8 / 126 | +$3,837 | −$43,247 | −$167,240 | 0 |
| stop slippage +10 bps | 10 / 8 / 126 | +$3,834 | −$43,110 | −$167,489 | 0 |
| stop slippage +25 bps | 10 / 8 / 126 | +$3,828 | −$43,039 | −$167,863 | 0 |
| next-open stops (D1) | 8 / 10 / 126 | +$3,401 | −$43,932 | −$166,906 | 0 |

- **No fixed point is a material improvement** (none reaches the $10,000 materiality threshold under any friction). The
  ten positive points are all **D1·GDX alone at A ≥ 30 %** (New L0: A 30 % with r 0.70 / 0.85, +$2,700 / +$3,837; A 40 %,
  +$1,332 to +$1,791; N/original: A 40 %, the same four values): each arms 1–3 times in nine years and changes one to
  three exits. The eight zero rows are Growth·VGT at A 40 % (never armed on D24).
- **Every other point loses**, and losses grow as the activation falls and as τ₂ tightens: mean Δ net by activation
  −$61.7k (7.5 %), −$71.6k (12.5 %), −$47.7k (20 %), −$40.3k (30 %), −$20.8k (40 %); by ratio −$56.0k (0.30), −$54.3k
  (0.50), −$40.1k (0.70), −$37.3k (0.85). Staging all three books is worst (New L0 mean −$77.4k, N/original −$89.4k).
- **Costs and stresses do not change the picture**: the ordering and signs are the same under +10 / +25 bps stop
  slippage and next-open fills; the staged exits add little cost (mean +$319) and save interest (mean −$7,377).
- **Risk:** marked DD improves at 16 points, is unchanged at 76 and worsens at 52; the risk envelope **never improves**
  (banked DD, liquidation: worse at 91 points, unchanged at 53; principal loss, liquidation: worse at 43, unchanged at
  101). The largest marked-DD reductions are −$4,216 (New L0, D1·GDX, A 12.5 %), each with a net loss of $44k–$47k.

## 3. Mechanism (non-official CPU replays of the 144 declared pairs; `reports/tables/ablation-mechanism.md`)

Each valid point B was replayed against its incumbent A (S1 OFF) in full detail on the CPU reference, in the complete
chronological shared-capital pool (`reports/diagnostics/ablation-D24.json`; door D24, use diagnostic; 14 s).

| Component (mean over the 144 pairs) | Δ net |
|---|---|
| Lots funded in both runs whose exit changed (staged exit earlier or at a different level) | −$16,503 |
| Displacement: lots newly funded minus lots no longer funded | −$30,439 |
| **Total Δ net** | **−$46,943** |
| of which interest (included in the lots' nets) | −$7,377 (less borrowing) |
| of which costs | +$319 |
| Forfeited trends (B's armed trailing exit vs. A's larger net on the same entry) | $22,297 forfeited |
| Lots per run | 33 → 36.5 (more, shorter lots) |
| Sessions held | −167 |

- **Where the loss comes from.** The staged exit locks in a fraction of an early peak, then ends the lot. In a
  continuing trend the book re-enters later at a worse price, or the slot and capital go to another lot; the trends that
  carried the incumbents (above all 2020: for New L0 staged on all three books at A 20 %, r 0.70, −$44,148 of the
  −$56,143 falls in 2020) are no longer held to their end. Displacement — strong lots no longer funded — is the
  largest component (about two thirds), exit truncation the rest.
- **Giveback is not the lever it appears to be.** The incumbents give back about 38 % of the ex-post peak profit of their
  winning lots (retained share 61.5 %). S1 lowers the absolute giveback (mean $247.5k → $234.0k) but lowers the ex-post
  peak more ($642.7k → $597.7k): the retained share does not improve (61.5 % → 60.9 %). The ex-post peak is not
  realizable; an armed stop's level is a protection identity, never P&L.
- **Why the D1·GDX high-activation points help a little.** At A ≥ 30 %, D1·GDX arms only on its largest spikes (1–3 times)
  and the tighter stage-2 stop exits a reversing spike a few percent higher; no displacement follows (0 lots newly / no
  longer funded). The gain is +$1.3k–$3.8k: real but immaterial, and it vanishes at lower activations, where arming
  becomes frequent (D1·GDX at A 7.5 %: 29 arms, 29 staged exits, 16 newly / 9 no longer funded lots, −$61,760).

## 4. Reading

On the fixed incumbents, S1 is a cost almost everywhere on D24: it converts open trend profit into earlier exits and
re-entries, and the shared pool turns those into displaced, lower-value lots. The fixed-parameter evidence offers no
reason to expect a large gain from S1 on top of the incumbents' exits; whether a jointly optimized configuration
(EXP: base genes re-tuned together with S1) can use it is the question of the paired search (`SEARCH_REPORT.md`).
