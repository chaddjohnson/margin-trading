# Blocked-opportunity audit: XRT lot "#88" and every decision XBI/XRT refused

Source: the continuous full-history runs of C5 (frozen B5, five ETFs) and C3 (the same frozen VGT/KRE/GDX books
without XBI and XRT), `results/final/final.json` → `audit` (sealed; identical in the confirmation re-run). A refused
decision is reported with its book's **virtual** outcome — what the shadow book's own trade did — which was **not
executed and is never counted as profit**. Only funded lots move the pool. Times are New York.

## 1. The XRT lot (the user's trade #88)

| Pool | Symbol | Entry | Exit | Exit reason | Net | Interest | Worst mark (MAE) |
|---|---|---|---|---|---:|---:|---:|
| C5 | XRT | 2025-11-12 09:39 | 2026-03-03 09:31 | maximum hold | **−$759.64** | $3,345.21 | −$6,073.00 |

It held the shared slot for 111 calendar days (2025-11-12 → 2026-03-03). The reported −$759.64 is confirmed exactly.

## 2. What it blocked

**Exactly one decision was refused while the XRT lot held the slot:**

| Decider | Holder | Decision | Setup | Virtual entry → exit | Virtual exit reason | Virtual net (not executed) |
|---|---|---|---|---|---|---:|
| VGT | XRT | 2025-11-21 09:49 | continuation (post-exit pullback) | 2025-11-21 09:49 → 2026-02-05 09:31 | maximum hold | −$2,325.67 |

- **GDX produced no decision at all between 2025-11-12 and 2026-03-03.** The B5 GDX book arms only 27.4% below its
  100-session high (no post-exit continuation window was open: its previous lot ended in April 2024); GDX's deepest
  regular-session close in the interval was 18.5% below the prior 100-session high (2026-02-05: $92.47 vs $113.50),
  and GDX made its all-time closing high ($115.87) on 2026-02-27. Its next decision was 2026-03-19 09:32, after the
  XRT exit, and it was funded in C5 as in C3.
- **Over the whole history (2017-06-15 → 2026-10-29) XRT never refused a GDX decision**; it refused one VGT and one KRE
  decision. XBI refused GDX twice (2022-05-12 13:12, virtual +$2,268.38; 2022-06-14 10:15, virtual −$7,895.85),
  both inside 2022.
- KRE produced no decision in the interval either.

{{table:audit_refused_by_xrt_xbi.md}}

## 3. The frozen three-ETF ablation (C3) through the same interval

| Pool | Funded lots entered 2025-11-12 → 2026-03-03 | Net | Interest |
|---|---|---:|---:|
| C5 | XRT 2025-11-12 09:39 → 2026-03-03 09:31 (maximum hold) | −$759.64 | $3,345.21 |
| C3 | **VGT 2025-11-21 09:49 → 2026-02-05 09:31 (maximum hold)** | **−$2,325.67** | $2,290.41 |

- Without XRT the slot went to the refused VGT continuation trade, which lost more: the interval is **$1,566.03
  worse** in C3. This is the entire FX-window difference between C5 and C3 (−$1,567).
- **Downstream displacement: none.** After 2025-11-12 the two runs share the same seven lots (GDX 2026-03-19, 05-19,
  06-09, 06-22, 07-13, 08-03, and the lot open since 2026-10-22); the only differences are the XRT lot (C5 only) and
  the VGT lot (C3 only). The VGT exit on 2026-02-05 and the XRT exit on 2026-03-03 both precede GDX's next decision
  (2026-03-19), so neither changed later eligibility.
- In 2022 the two GDX decisions XBI refused in C5 were refused **by VGT** in C3 (VGT held the slot instead): removing
  XBI gave GDX nothing there either. Over the whole history GDX is refused 9 times in both pools (C5: KRE 3, VGT 4, XBI
  2; C3: KRE 3, VGT 6).

## 4. The same interval in the restricted research pools

T1-P and T1-S (Track 1 GDX vectors) also funded the VGT lot 2025-11-21 → 2026-02-05 and had **no GDX decision** in the
interval. No restricted configuration received a GDX opportunity during the XRT lot.

## 5. Conclusion

The hypothesis that XRT lot #88 crowded out attractive GDX trades is **not supported**: the GDX book never signalled
during it, XRT never blocked GDX at any time, and removing XRT replaced a −$759.64 XRT lot with a −$2,325.67 VGT lot.
The cost of the five-ETF B5's XBI/XRT books in 2024–2026 was not opportunity blocking; their contribution was earned
(and lost) in 2016–2023 (`POOL_B5_THREE_ETF_RESULTS.md` §1: XBI +$53,064, XRT +$12,842 over the full history).
Margin blockage, eligibility (no GDX setup), priority among the remaining ETFs (VGT took the slot) and continuation
state (the VGT decision was a post-exit continuation entry) are distinguished above; data were complete for every
session of the interval (DATA_AUDIT.md).
