# Development versus holdout (holdout attempt 1, manifest d3645e1e8b8dafbdbf5ca6b7ef3b78745a3389b7730b19f68df0647377f4ca7e)

| Ticker | Role | Parameters | Dev net | Dev minute DD | Dev entries | Holdout net | Holdout minute DD | Holdout entries | Holdout W/L | Holdout Δ vs D1 | Dev Δ vs D1 | Generalized? | Combined net | Combined minute DD |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| XBI | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $35,145 | $68,829 | 45 | −$745 | $22,473 | 2 | 2/1 | — | — | — | $34,400 | $68,829 |
| XBI | primary | X 29.1% Y 1.2% L 64 stop 10.4% hold 3 buffer 0.1% P 10.7% W 29 | $151,799 | $27,885 | 24 | $54,247 | $12,963 | 1 (1 open) | 0/0 | +$54,993 | +$116,653 | yes (both positive) | $206,046 | $27,885 |
| XBI | alternate-lowDd | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | $118,055 | $12,837 | 29 | $0 | $0 | 0 | 0/0 | +$745 | +$82,910 | yes (both positive) | $118,055 | $12,837 |
| IWM | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $13,778 | $39,694 | 12 | $29,105 | $10,223 | 1 (1 open) | 0/0 | — | — | — | $42,883 | $39,694 |
| IWM | primary | X 27.3% Y 0.4% L 199 stop 3.3% hold 11 buffer 5.8% P 5.5% W 127 | $120,856 | $14,910 | 38 | $13,783 | $7,911 | 3 | 3/0 | −$15,322 | +$107,078 | no (dev gain, holdout loss) | $134,639 | $14,910 |
| IWM | alternate-lowDd | X 28.3% Y 0.5% L 211 stop 3.3% hold 13 buffer 5.9% P 5.5% W 96 | $106,642 | $13,303 | 33 | $15,732 | $8,067 | 3 | 3/0 | −$13,373 | +$92,864 | no (dev gain, holdout loss) | $122,373 | $13,303 |
| XRT | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $41,132 | $41,800 | 34 | $20,597 | $11,073 | 3 (1 open) | 2/0 | — | — | — | $61,729 | $41,800 |
| XRT | primary | X 24.4% Y 2.0% L 49 stop 7.7% hold 9 buffer 2.8% P 6.5% W 103 | $145,468 | $23,383 | 24 | $20,261 | $10,408 | 2 (1 open) | 1/0 | −$336 | +$104,336 | no (dev gain, holdout loss) | $165,729 | $23,383 |
| XRT | alternate-lowDd | X 24.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 6.2% W 120 | $127,705 | $19,966 | 18 | $20,730 | $11,679 | 1 | 1/0 | +$133 | +$86,574 | yes (both positive) | $148,436 | $19,966 |
| KRE | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $4,950 | $55,799 | 32 | $15,012 | $15,483 | 6 (1 open) | 3/2 | — | — | — | $19,962 | $55,799 |
| KRE | primary | X 29.9% Y 2.8% L 233 stop 3.1% hold 5 buffer 2.8% P 9.4% W 100 | $171,785 | $26,271 | 70 | $23,262 | $7,402 | 5 | 4/1 | +$8,251 | +$166,835 | yes (both positive) | $195,048 | $26,271 |
| KRE | alternate-lowDd | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | $158,512 | $22,725 | 73 | $15,635 | $7,402 | 4 | 3/1 | +$624 | +$153,562 | yes (both positive) | $174,148 | $22,725 |
| XLY | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $72,921 | $29,065 | 17 | $21,788 | $8,722 | 2 (1 open) | 0/1 | — | — | — | $94,709 | $29,065 |
| XLY | primary | X 21.3% Y 3.5% L 112 stop 3.1% hold 10 buffer 0.8% P 8.4% W 175 | $112,490 | $16,972 | 30 | −$3,360 | $11,650 | 3 | 2/2 | −$25,148 | +$39,569 | no (dev gain, holdout loss) | $109,130 | $16,972 |
| XLY | alternate-lowDd | X 21.4% Y 4.1% L 126 stop 3.0% hold 6 buffer 1.4% P 9.1% W 188 | $86,163 | $11,366 | 34 | −$4,922 | $10,227 | 3 | 2/1 | −$26,711 | +$13,243 | no (dev gain, holdout loss) | $81,241 | $14,125 |
| IWN | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $20,255 | $41,879 | 10 | $10,155 | $9,454 | 1 | 1/0 | — | — | — | $30,410 | $41,879 |
| IWN | primary | X 24.9% Y 0.6% L 243 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191 | $111,181 | $16,875 | 38 | $6,158 | $6,593 | 3 | 3/0 | −$3,996 | +$90,925 | no (dev gain, holdout loss) | $117,339 | $16,875 |
| IWN | alternate-lowDd | X 27.4% Y 0.4% L 96 stop 3.5% hold 4 buffer 5.9% P 12.7% W 191 | $84,673 | $15,180 | 22 | $8,917 | $6,827 | 2 | 2/0 | −$1,238 | +$64,418 | no (dev gain, holdout loss) | $93,590 | $15,180 |
| XLF | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $20,729 | $32,211 | 14 | $0 | $0 | 0 | 0/0 | — | — | — | $20,729 | $32,211 |
| XLF | primary | X 25.4% Y 1.6% L 200 stop 4.0% hold 8 buffer 0.6% P 4.1% W 19 | $121,499 | $17,071 | 30 | $0 | $0 | 0 | 0/0 | +$0 | +$100,770 | no (dev gain, holdout loss) | $121,499 | $17,071 |
| XLF | alternate-lowDd | X 25.1% Y 0.4% L 213 stop 3.7% hold 5 buffer 0.8% P 7.3% W 15 | $99,222 | $12,762 | 30 | $0 | $0 | 0 | 0/0 | +$0 | +$78,494 | no (dev gain, holdout loss) | $99,222 | $12,762 |
| XLE | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $26,974 | $72,402 | 32 | $0 | $0 | 0 | 0/0 | — | — | — | $26,974 | $72,402 |
| XLE | primary | X 28.0% Y 2.7% L 52 stop 6.5% hold 4 buffer 0.0% P 13.1% W 47 | $154,448 | $24,861 | 23 | $0 | $0 | 0 | 0/0 | +$0 | +$127,473 | no (dev gain, holdout loss) | $154,448 | $24,861 |
| XLE | alternate-lowDd | X 29.7% Y 2.7% L 72 stop 5.2% hold 4 buffer 0.0% P 13.2% W 62 | $120,741 | $22,438 | 25 | $0 | $0 | 0 | 0/0 | +$0 | +$93,766 | no (dev gain, holdout loss) | $120,741 | $22,438 |
