# Overlap diagnostic — fold-b (record 32b8fec7a694; P0 runs; hindsight fields are in the record, never used)

| pool | members | decisions | refused | funded lots | refused while a lot held | ranking | higher-priority | … with estimate ≥ $0 | actionable | same-minute ties |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B4 | VGT XBI XRT KRE | 73 | 51 | 22 | 51 | fold-b/R1 | 4 | 0 | 0 | 0 |
| B4 | VGT XBI XRT KRE | 73 | 51 | 22 | 51 | fold-b/R2 | 47 | 41 | 40 | 0 |
| B5 | VGT XBI XRT KRE GDX | 79 | 39 | 40 | 39 | fold-b/R1 | 13 | 7 | 7 | 0 |
| B5 | VGT XBI XRT KRE GDX | 79 | 39 | 40 | 39 | fold-b/R2 | 22 | 16 | 15 | 0 |
| C_R1 | XLK VGT XME GDX XLI | 49 | 36 | 13 | 35 | fold-b/R1 | 11 | 6 | 6 | 2 |
| C_R2 | XOP IWN VGK IWM KRE | 94 | 59 | 35 | 59 | fold-b/R2 | 19 | 11 | 11 | 6 |

| ranking | counts (actionable) | threshold | material | Stage D budget share |
| --- | --- | --- | --- | --- |
| R1 | {"B4":0,"B5":7,"C_R1":6} | 3 | yes | 100.00% |
| R2 | {"B4":40,"B5":15,"C_R2":11} | 3 | yes | 100.00% |

- B4 collisions (decider → holder: count): KRE→VGT 31/XRT 1, VGT→KRE 1, XRT→KRE 1/VGT 7, XBI→KRE 2/VGT 8
- B5 collisions (decider → holder: count): KRE→VGT 6/GDX 6/XBI 2/XRT 1, VGT→KRE 1/GDX 2, GDX→KRE 2, XRT→KRE 3/GDX 1/VGT 4, XBI→GDX 3/KRE 5/VGT 3
- C_R1 collisions (decider → holder: count): XLK→GDX 3/VGT 1/XME 1, VGT→GDX 2/XME 2/XLK 2, XLI→GDX 3/XME 5/XLK 1, GDX→XME 4/XLK 3, XME→GDX 2/XLK 6
- C_R2 collisions (decider → holder: count): IWM→XOP 4/VGK 2/IWN 4/KRE 1, KRE→XOP 6/VGK 3/IWN 14, IWN→XOP 2/VGK 2/KRE 1/IWM 1, VGK→XOP 1/IWN 4, XOP→VGK 4/IWN 8/KRE 2
