# Workstream C — books (leave-one-book-out) and the B5 − B4 difference

Each ablation removes one book and keeps everything else frozen:
- the other books' phenotypes;
- the shadow allocator (one slot, alphabetical same-minute ties);
- the costs, interest, data window and portfolio conventions.

The pool is then re-run as a whole. Removing a book does more than delete its trades. It frees the single slot, so
other books fund signals that were refused before ("gained") and lose lots they held before ("lost"). The book's
**increment** is therefore the parent pool minus the ablated pool, not the book's own P&L.

Machine-readable results:
- `results/C_ablation.csv`;
- `results/C_bridge_B5_vs_B4.csv`;
- `results/runs/ablation.jsonl`.

## Fixed pool ($100,000 slot, 5 bps, 11%)

{{t.ablationFixed}}

## Dynamic portfolio ($300,000, 60/40 core, 20% borrowing)

"Book effect on % DD" is the parent's max % DD minus the ablated pool's. Positive means the book **adds** drawdown;
negative means it **reduces** drawdown.

{{t.ablationPortfolio}}

## What each book contributes

- **GDX (B5):** the largest and cleanest contribution.
  - Fixed: {{v.abl.B5.GDX.fixedInc}}. Portfolio: {{v.abl.B5.GDX.portInc}}.
  - Max daily % DD {{v.abl.B5.GDX.daily}}, max minute % DD {{v.abl.B5.GDX.minute}}: it lowers the drawdown.
  - GDX's own {{v.abl.B5.GDX.ownLots}} lots earn {{v.abl.B5.GDX.own}}. Its occupancy also reshuffles the other
    books. When GDX is removed, they fund lots they could not fund before ({{v.abl.B5.GDX.gained}}), and they lose
    lots that GDX's timing had enabled ({{v.abl.B5.GDX.lost}}). The two nearly cancel.
- **KRE:** a large gross contributor and the main source of fixed-pool drawdown.
  - B4: {{v.abl.B4.KRE.fixedInc}} fixed and {{v.abl.B4.KRE.portInc}} portfolio. It adds {{v.abl.B4.KRE.ddImpact}}
    of fixed minute DD and {{v.abl.B4.KRE.daily}} of portfolio daily DD.
  - In B5 its effect on the portfolio drawdown reverses ({{v.abl.B5.KRE.daily}}). Removing KRE from B5 raises the
    drawdown, because the March-2020 slot sequence changes.
- **XBI:** a modest fixed contributor ({{v.abl.B4.XBI.fixedInc}} in B4, {{v.abl.B5.XBI.fixedInc}} in B5).
  - In B5 it is a strong drawdown **reducer** ({{v.abl.B5.XBI.daily}} daily): without XBI, the March-2020 slot
    sequence changes and B5's drawdown rises to 33%.
  - This is the same slot-sequence fragility the parameter neighbourhoods show.
- **XRT:** small but clean. {{v.abl.B4.XRT.fixedInc}} (B4) and {{v.abl.B5.XRT.fixedInc}} (B5), with no drawdown effect.
- **VGT in B4 is nearly redundant in fixed terms.**
  - Its own {{v.abl.B4.VGT.ownLots}} lots earn {{v.abl.B4.VGT.own}}. Removing it lets the other books fund
    {{v.abl.B4.VGT.gained}} instead, so its increment is only {{v.abl.B4.VGT.fixedInc}}.
  - In the portfolio its increment is **negative** ({{v.abl.B4.VGT.portInc}}), and it adds {{v.abl.B4.VGT.daily}} of
    daily DD.
  - Its lots are long VGT on top of a core that is 40% VGT, and they hold the slot for long stretches. The median
    VGT lot lasts about a month, against about 5 days for KRE and XBI.
  - In B5, VGT's increment is positive ({{v.abl.B5.VGT.fixedInc}} fixed, {{v.abl.B5.VGT.portInc}} portfolio), but it
    still adds {{v.abl.B5.VGT.daily}} of daily DD.

**None of this makes a book "redundant" in a forward sense.** Each increment is a single path through one shared slot,
and small timing changes reorder who holds it (see the neighbourhood results). The ablations identify **interactions**,
not book quality:
- slot competition (the refusal matrices below);
- freed capacity;
- the correlation of VGT lots with the core.

## Is "B5 without GDX" operationally B4?

Yes. B5 − GDX is {{v.b5MinusGdx}}. Book order, same-minute tie order (alphabetical), funding and accounting depend only
on the set of books, so removing GDX reproduces B4 exactly. All differences between B5 and B4 are therefore caused
by the GDX book: its own lots plus the slot displacements it causes.

## The B5 − B4 bridge (fixed pool)

The bridge matches lots by (book, decision time). Lots both pools funded are identical in fixed mode. The bridge's
residual against the net difference is {{v.bridgeResidual}}.

{{t.bridgeSummary}}

By exit year:

{{t.bridgeByYear}}

By the regime of the lot's entry (§4 windows; "outside R1–R4" includes 2026):

{{t.bridgeByRegime}}

The 20 largest bridge rows by absolute contribution:

{{t.bridgeTop}}

**Diversification or a few big trades?**

- **The advantage is mostly GDX's own trades.** GDX's {{v.gdxLots}} lots ({{v.gdxWins}} winners) earn {{v.gdxNet}},
  slightly **more** than the whole difference. The displaced and enabled lots of the other books net to about −$3k.
  So B5's advantage is not a diversification effect on the other books' trades.
- **It is concentrated in a few of those trades.** The top GDX lot provides {{v.gdxTop1}} of the difference, the top
  three {{v.gdxTop3}} and the top five {{v.gdxTop5}}. Four GDX lots in March–April 2020 provide about $92k.
- **The portfolio drawdown benefit is a real diversification effect, but a path-dependent one.** GDX was the book
  making money in March 2020, while the core and the equity-sector books were falling. That is a gold-miner/equity
  diversification story with an economic rationale. But it rests on that one episode, and on GDX winning the single
  slot at the right minutes.

## Slot competition (signals refused, by holder; fixed pool)

**B4**

{{t.refusals.B4}}

**B5**

{{t.refusals.B5}}

In B4, VGT's long holds refuse 34 KRE signals. In B5, GDX holds the slot instead at several of those moments: GDX
refuses 16 KRE signals, and VGT only 9.
