| job | backend | risk | lanes | fresh | archive hits | wall s | evaluations / s | host workers | batches (median size) | peak RSS MiB |
|---|---|---|---|---|---|---|---|---|---|---|
| a2-plain | gpu | false | 128 | 2,196,920 | 15,979 | 724.2 | 3033.7 | 8 | 311 (8192) | 4962 |
| a3-plain | gpu | false | 64 | 1,242,714 | 7,607 | 583.9 | 2128.1 | 8 | 211 (7980) | 4618 |
| a3-risk | gpu | true | 64 | 1,242,714 | 7,607 | 681.6 | 1823.2 | 8 | 211 (7980) | 4881 |
| mini-conc-plain | gpu | false | 16 | 30,749 | 538 | 118.4 | 259.8 | 8 | 36 (376) | 2242 |
| mini-conc-risk | gpu | true | 16 | 30,749 | 538 | 136.6 | 225.1 | 8 | 36 (376) | 2259 |
| mini-cpu | cpu | false | 16 | 30,749 | 538 | 126 | 244.1 | 0 | — | 725 |
| mini-gpu-w0 | gpu | false | 16 | 30,749 | 538 | 72.5 | 424.4 | 0 | 36 (376) | 1002 |
| mini-gpu-w1 | gpu | false | 16 | 30,749 | 538 | 73.3 | 419.3 | 1 | 37 (360) | 1407 |
| mini-gpu-w8 | gpu | false | 16 | 30,749 | 538 | 65.6 | 468.6 | 8 | 36 (376) | 2082 |
| mini-kill | gpu | false | 16 | 29,212 | 2,075 | 63.3 | 461.4 | 8 | 39 (360) | 2162 |
| mini-risk-cpu | cpu | true | 16 | 30,749 | 538 | 845.9 | 36.4 | 0 | — | 605 |
| mini-risk-gpu | gpu | true | 16 | 30,749 | 538 | 83.6 | 368 | 8 | 36 (376) | 2197 |
| mini-stop | gpu | false | 16 | 22,450 | 8,837 | 29.6 | 757.3 | 8 | 36 (376) | 2022 |
