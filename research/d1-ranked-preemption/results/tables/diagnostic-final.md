# Overlap diagnostic — final (record 61d537c530f3; P0 runs; hindsight fields are in the record, never used)

| pool | members | decisions | refused | funded lots | refused while a lot held | ranking | higher-priority | … with estimate ≥ $0 | actionable | same-minute ties |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B4 | VGT XBI XRT KRE | 137 | 66 | 71 | 65 | final/R1 | 9 | 2 | 2 | 0 |
| B4 | VGT XBI XRT KRE | 137 | 66 | 71 | 65 | final/R2 | 51 | 43 | 42 | 0 |
| B5 | VGT XBI XRT KRE GDX | 155 | 73 | 82 | 73 | final/R1 | 21 | 11 | 11 | 2 |
| B5 | VGT XBI XRT KRE GDX | 155 | 73 | 82 | 73 | final/R2 | 45 | 34 | 32 | 2 |
| C_R1 | FXI XME XLI VGT IBB | 69 | 38 | 31 | 38 | final/R1 | 19 | 9 | 9 | 0 |
| C_R2 | IWN XME XLE KIE XBI | 113 | 64 | 49 | 64 | final/R2 | 23 | 10 | 7 | 2 |

| ranking | counts (actionable) | threshold | material | Stage D budget share |
| --- | --- | --- | --- | --- |
| R1 | {"B4":2,"B5":11,"C_R1":9} | 5 | yes | 100.00% |
| R2 | {"B4":42,"B5":32,"C_R2":7} | 5 | yes | 100.00% |

- B4 collisions (decider → holder: count): KRE→VGT 31/XRT 1/XBI 3, VGT→KRE 1/XBI 3/XRT 2, XRT→KRE 1/VGT 7/XBI 4, XBI→KRE 2/VGT 10
- B5 collisions (decider → holder: count): KRE→VGT 6/GDX 16/XBI 5/XRT 1, VGT→KRE 1/GDX 4/XBI 3, GDX→KRE 3/XBI 2/VGT 4, XRT→KRE 3/GDX 3/VGT 5/XBI 4, XBI→GDX 3/KRE 5/VGT 5
- C_R1 collisions (decider → holder: count): XLI→IBB 2/XME 8, VGT→IBB 5/XME 7/XLI 1, IBB→XME 2/XLI 1, FXI→XLI 1/IBB 3/XME 2/VGT 1, XME→XLI 2/IBB 3
- C_R2 collisions (decider → holder: count): IWN→XBI 1/XLE 2/XME 1/KIE 3, XLE→XBI 3/XME 3/IWN 8/KIE 6, XME→XLE 1/IWN 4/KIE 2/XBI 4, KIE→XLE 1/XME 2/IWN 10, XBI→XLE 2/XME 4/IWN 6/KIE 1
