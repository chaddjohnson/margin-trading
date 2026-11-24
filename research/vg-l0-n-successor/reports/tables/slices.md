# Fold slices and the validation (retrospective, previously examined history)

| Fold | Subject | Roles | Slice P&L | Slice DD (reset) | Whole-run net | Whole-run DD | Training nbhd on slice: breaches > $35k [Wilson 95 %] | Training breach share | V1–V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | C19/refine/GD1.VA1/R102#1 profit | primary F/original; primary B/original; role F/actual-profit | $-31,152.03 | $51,065.51 | $147,767.99 | $51,065.51 | 88.3 % [83.8 %, 91.7 %] | 5.1 % |  |
| C19 | C19/refine/GA0.VA0/R102#1 profit | primary L/original; role L/actual-profit; role L/robust-profit | $72,692.63 | $35,560.29 | $178,761.18 | $35,560.29 | 57.8 % [51.7 %, 63.7 %] | 0.4 % |  |
| C19 | C19/refine/GC1.VC1/R103#1 profit | role F/robust-profit | $-217.14 | $68,234.82 | $158,825.37 | $68,234.82 | 100.0 % [98.5 %, 100.0 %] | 0.0 % |  |
| C19 | C19/refine/GC1.VB0/R101#2 robust | role F/balanced | $54,096.37 | $51,203.90 | $225,914.02 | $51,203.90 | 98.0 % [95.5 %, 99.2 %] | 0.0 % |  |
| C19 | C19/refine/GD1.VA1/R104#3 balanced | role F/lower-drawdown; role B/lower-drawdown | $41,408.18 | $27,993.60 | $127,361.41 | $27,993.60 | 25.4 % [20.4 %, 31.1 %] | 0.4 % |  |
| C19 | C19/refine/GA0.VA0/R103#3 balanced | role L/balanced | $62,390.53 | $42,115.75 | $155,606.16 | $42,115.75 | 100.0 % [98.5 %, 100.0 %] | 0.0 % |  |
| C19 | C19/broad/GA0.VA0/R101#2 robust | role L/lower-drawdown | $16,225.27 | $48,408.93 | $90,836.76 | $48,408.93 | 100.0 % [98.5 %, 100.0 %] | 0.0 % |  |
| C19 | C19/refine/GC1.VB0/R104#2 robust | role B/robust-profit; role B/balanced | $85,439.45 | $57,340.52 | $247,124.27 | $57,340.52 | 100.0 % [98.5 %, 100.0 %] | 2.7 % |  |
| C19 | control: N/original | control control: N/original | $171,401.67 | $17,280.74 | $251,838.53 | $17,280.74 | 0.0 % [0.0 %, 1.5 %] | 0.0 % |  |
| C19 | control: New L0 | control control: New L0 | $171,402.70 | $17,280.74 | $251,372.87 | $17,280.74 | 0.0 % [0.0 %, 1.5 %] | 0.0 % |  |
| C21 | C21/refine/GB0.VA1/R103#1 profit | primary F/original; role F/actual-profit | $-5,131.87 | $54,127.90 | $263,073.76 | $54,127.90 | 99.6 % [97.8 %, 99.9 %] | 3.1 % |  |
| C21 | C21/refine/GA0.VA0/R104#1 profit | primary L/original; role L/actual-profit | $-12,113.82 | $42,848.97 | $226,270.57 | $44,241.86 | 81.3 % [76.0 %, 85.6 %] | 2.7 % |  |
| C21 | C21/refine/GB1.VA0/R101#1 profit | primary B/original; role B/actual-profit | $-39,530.17 | $52,648.80 | $223,012.48 | $54,183.73 | 68.8 % [62.8 %, 74.1 %] | 0.0 % |  |
| C21 | C21/refine/GB1.VA0/R102#2 robust | role F/robust-profit; role B/robust-profit | $-47,483.69 | $60,616.60 | $199,733.53 | $62,142.34 | 94.1 % [90.6 %, 96.4 %] | 0.0 % |  |
| C21 | C21/refine/GB1.VA0/R103#3 balanced | role F/balanced; role B/balanced | $-38,330.86 | $60,720.25 | $169,894.08 | $62,038.05 | 99.2 % [97.2 %, 99.8 %] | 0.0 % |  |
| C21 | C21/refine/GC0.VC0/R103#3 balanced | role F/lower-drawdown | $-1,252.57 | $37,344.02 | $167,493.90 | $38,273.46 | 61.7 % [55.6 %, 67.5 %] | 0.0 % |  |
| C21 | C21/refine/GA0.VA0/R101#2 robust | role L/robust-profit | $-13,787.95 | $44,550.53 | $210,910.37 | $45,818.84 | 84.4 % [79.4 %, 88.3 %] | 7.0 % |  |
| C21 | C21/refine/GA0.VA0/R101#3 balanced | role L/balanced; role L/lower-drawdown; role B/lower-drawdown | $13,002.65 | $26,778.28 | $212,449.60 | $28,052.27 | 51.2 % [45.1 %, 57.2 %] | 0.0 % |  |
| C21 | control: N/original | control control: N/original | $92,082.39 | $19,459.83 | $343,920.92 | $19,459.83 | 2.0 % [0.8 %, 4.5 %] | 0.0 % |  |
| C21 | control: New L0 | control control: New L0 | $87,238.48 | $19,459.83 | $338,611.35 | $19,459.83 | 4.3 % [2.4 %, 7.5 %] | 0.0 % |  |
| C23 | C23/refine/GA1.VA0/R101#1 profit | primary F/original; primary B/original; role F/actual-profit | $475.22 | $18,782.58 | $287,403.57 | $27,369.86 | 0.0 % [0.0 %, 1.5 %] | 5.5 % |  |
| C23 | C23/refine/GA0.VA0/R103#1 profit | primary L/original; role L/actual-profit | $-121.97 | $19,032.73 | $223,956.65 | $21,676.65 | 0.0 % [0.0 %, 1.5 %] | 1.9 % |  |
| C23 | C23/refine/GA1.VB0/R104#1 profit | role F/robust-profit | $1,315.72 | $40,369.09 | $258,947.58 | $40,369.09 | 96.5 % [93.5 %, 98.1 %] | 0.0 % |  |
| C23 | C23/refine/GB0.VD1/R101#2 robust | role F/balanced | $5,308.51 | $17,135.00 | $188,895.89 | $17,744.39 | 0.0 % [0.0 %, 1.5 %] | 0.0 % |  |
| C23 | C23/refine/GA1.VC0/R101#3 balanced | role F/lower-drawdown | $0.00 | $0.00 | $153,463.12 | $17,280.74 | 0.0 % [0.0 %, 1.5 %] | 0.0 % |  |
| C23 | C23/refine/GA0.VA0/R104#1 profit | role L/robust-profit | $5,862.99 | $19,957.89 | $228,650.84 | $22,068.60 | 0.0 % [0.0 %, 1.5 %] | 5.5 % |  |
| C23 | C23/refine/GA0.VA0/R102#3 balanced | role L/balanced; role L/lower-drawdown | $-9,955.12 | $15,854.92 | $161,906.03 | $18,063.32 | 0.0 % [0.0 %, 1.5 %] | 0.0 % |  |
| C23 | C23/refine/GD1.VB0/R103#2 robust | role B/robust-profit | $7,549.97 | $14,407.93 | $236,810.05 | $23,551.87 | 0.0 % [0.0 %, 1.5 %] | 1.2 % |  |
| C23 | C23/refine/GB0.VC1/R102#2 robust | role B/balanced | $-1,403.67 | $13,212.05 | $182,545.50 | $17,744.39 | 0.0 % [0.0 %, 1.5 %] | 0.0 % |  |
| C23 | C23/refine/GD1.VC1/R102#3 balanced | role B/lower-drawdown | $4,321.67 | $10,050.64 | $149,745.82 | $17,280.74 | 0.0 % [0.0 %, 1.5 %] | 0.0 % |  |
| C23 | control: N/original | control control: N/original | $44,110.10 | $9,105.84 | $388,031.02 | $19,459.83 | 0.0 % [0.0 %, 1.5 %] | 2.7 % |  |
| C23 | control: New L0 | control control: New L0 | $44,110.10 | $9,105.84 | $382,721.46 | $19,459.83 | 0.0 % [0.0 %, 1.5 %] | 4.7 % |  |
| C24 | C24/refine/GA0.VB1/R102#1 profit | primary F/original; role F/actual-profit; finalist | $31,010.33 | $34,380.49 | $320,150.86 | $34,380.49 | 18.0 % [13.8 %, 23.1 %] | 4.7 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GA0.VA0/R101#1 profit | primary L/original; role L/actual-profit; finalist | $26,854.03 | $22,868.86 | $291,446.54 | $23,483.92 | 1.6 % [0.6 %, 3.9 %] | 1.9 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GA0.VB1/R101#4 control alternative | primary B/original; role B/actual-profit; finalist | $45,690.31 | $28,183.91 | $316,170.49 | $28,183.91 | 11.7 % [8.3 %, 16.2 %] | 0.8 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GB.VA/R103#1 profit | primary N/original; primary U/original; role N/actual-profit | $94,669.70 | $20,385.99 | $486,521.87 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 1.2 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GD1.VA1/R103#2 robust | role F/robust-profit; role B/robust-profit; finalist | $41,826.90 | $25,420.18 | $255,249.48 | $28,312.43 | 0.0 % [0.0 %, 1.5 %] | 3.9 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GD1.VB1/R104#2 balanced | role F/balanced; role U/balanced; finalist | $30,904.58 | $35,924.63 | $224,961.18 | $40,497.31 | 64.8 % [58.8 %, 70.4 %] | 1.9 % | V1 pass, V2 FAIL, V3 FAIL |
| C24 | C24/refine/GA0.VA0/R101#3 balanced | role F/lower-drawdown; role L/lower-drawdown; role B/lower-drawdown | $8,362.01 | $20,179.80 | $146,973.06 | $20,179.80 | 0.0 % [0.0 %, 1.5 %] | 0.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GA0.VA0/R101#2 robust | role L/robust-profit | $47,550.71 | $18,984.63 | $264,226.39 | $25,706.35 | 0.0 % [0.0 %, 1.5 %] | 4.7 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GA0.VA0/R104#3 balanced | role L/balanced | $52,072.66 | $24,590.93 | $252,172.92 | $24,590.93 | 0.0 % [0.0 %, 1.5 %] | 0.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GA1.VC1/R103#3 balanced | role B/balanced | $26,879.10 | $21,158.76 | $230,314.08 | $21,158.76 | 0.0 % [0.0 %, 1.5 %] | 0.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GB.VC/R108#2 robust | role N/robust-profit; role U/robust-profit; finalist | $63,531.48 | $31,824.70 | $376,102.19 | $32,625.05 | 1.2 % [0.4 %, 3.4 %] | 8.6 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GA.VC/R101#2 robust | role N/balanced; finalist | $62,741.35 | $20,747.48 | $431,523.22 | $23,083.79 | 0.4 % [0.1 %, 2.2 %] | 1.9 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GC.VC/R105#4 best GC0.VC0 | role N/lower-drawdown; finalist | $29,038.85 | $21,354.11 | $165,236.51 | $21,354.11 | 0.0 % [0.0 %, 1.5 %] | 0.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GB1.VB0/R103#3 balanced | role U/lower-drawdown; finalist | $54,786.55 | $23,409.32 | $167,960.44 | $23,409.32 | 11.3 % [8.0 %, 15.8 %] | 0.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GA1.VC1/R101#1 profit | finalist | $-10,050.39 | $37,643.48 | $259,852.19 | $50,754.22 | 72.7 % [66.9 %, 77.8 %] | 0.8 % | V1 FAIL, V2 FAIL, V3 FAIL |
| C24 | C24/broad/GA0.VD0/R104#1 profit | finalist | $15,598.48 | $16,840.86 | $217,071.67 | $18,514.22 | 0.0 % [0.0 %, 1.5 %] | 2.3 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/broad/GB1.VA0/R102#1 profit | finalist | $52,252.71 | $18,579.63 | $261,839.82 | $21,055.30 | 0.0 % [0.0 %, 1.5 %] | 3.5 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GB1.VB0/R102#1 profit | finalist | $43,262.91 | $18,657.06 | $280,628.48 | $29,815.18 | 0.0 % [0.0 %, 1.5 %] | 0.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GB1.VC0/R104#1 profit | finalist | $41,852.75 | $25,658.46 | $310,949.11 | $25,658.46 | 2.3 % [1.1 %, 5.0 %] | 0.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GB0.VD1/R103#1 profit | finalist | $-23,601.19 | $30,828.65 | $230,257.34 | $31,623.49 | 14.8 % [11.0 %, 19.7 %] | 9.8 % | V1 FAIL, V2 pass, V3 pass |
| C24 | C24/broad/GC1.VA1/R103#1 profit | finalist | $-9,453.25 | $28,588.66 | $205,715.70 | $28,588.66 | 2.0 % [0.8 %, 4.5 %] | 1.2 % | V1 FAIL, V2 pass, V3 pass |
| C24 | C24/refine/GC1.VB1/R101#1 profit | finalist | $12,779.60 | $18,282.15 | $300,628.83 | $20,043.76 | 0.0 % [0.0 %, 1.5 %] | 6.6 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/broad/GC0.VC0/R104#1 profit | finalist | $-9,742.04 | $18,950.84 | $188,040.54 | $24,273.15 | 2.0 % [0.8 %, 4.5 %] | 3.1 % | V1 FAIL, V2 pass, V3 pass |
| C24 | C24/broad/GC1.VD0/R101#1 profit | finalist | $67,090.74 | $23,678.77 | $271,864.16 | $23,678.77 | 0.0 % [0.0 %, 1.5 %] | 8.2 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GD1.VA1/R104#1 profit | finalist | $16,395.58 | $34,309.15 | $260,650.38 | $34,309.15 | 27.3 % [22.2 %, 33.1 %] | 3.9 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GD1.VB1/R103#1 profit | finalist | $45,689.42 | $11,327.75 | $290,632.34 | $17,744.39 | 0.0 % [0.0 %, 1.5 %] | 4.3 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/refine/GD0.VC1/R103#1 profit | finalist | $1,239.81 | $35,739.72 | $263,705.16 | $46,873.29 | 66.0 % [60.0 %, 71.5 %] | 0.0 % | V1 pass, V2 FAIL, V3 FAIL |
| C24 | C24/broad/GD1.VD0/R103#1 profit | finalist | $31,940.42 | $19,836.83 | $252,710.34 | $28,128.49 | 0.0 % [0.0 %, 1.5 %] | 7.8 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GA.VA/R104#1 profit | finalist | $92,661.48 | $20,385.99 | $481,586.80 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 2.3 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GA.VB/R108#1 profit | finalist | $72,602.08 | $20,385.99 | $462,372.78 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 1.2 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GA.VC/R108#1 profit | finalist | $70,669.25 | $20,385.99 | $453,943.87 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 7.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GA.VD/R107#1 profit | finalist | $70,817.04 | $20,385.99 | $461,454.61 | $20,385.99 | 0.4 % [0.1 %, 2.2 %] | 2.3 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GB.VB/R104#1 profit | finalist | $94,669.70 | $20,385.99 | $485,307.27 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 1.6 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GB.VC/R107#1 profit | finalist | $93,643.87 | $20,385.99 | $477,350.61 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 7.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GB.VD/R101#1 profit | finalist | $94,669.70 | $20,385.99 | $484,840.51 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 1.9 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GC.VA/R105#1 profit | finalist | $71,906.86 | $21,273.69 | $436,122.38 | $21,273.69 | 0.8 % [0.2 %, 2.8 %] | 10.5 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GC.VB/R101#1 profit | finalist | $68,004.97 | $21,901.32 | $430,211.73 | $21,901.32 | 1.6 % [0.6 %, 3.9 %] | 9.4 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GC.VC/R101#1 profit | finalist | $98,058.77 | $25,179.56 | $465,591.93 | $25,179.56 | 0.4 % [0.1 %, 2.2 %] | 2.3 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GC.VD/R108#1 profit | finalist | $86,180.22 | $26,480.64 | $453,071.48 | $26,480.64 | 0.4 % [0.1 %, 2.2 %] | 7.4 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GD.VA/R101#1 profit | finalist | $96,774.89 | $20,385.99 | $486,269.20 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 1.6 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GD.VB/R108#1 profit | finalist | $94,669.70 | $20,385.99 | $485,969.05 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 1.2 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GD.VC/R107#1 profit | finalist | $104,340.71 | $20,878.45 | $488,884.83 | $20,878.45 | 0.0 % [0.0 %, 1.5 %] | 7.0 % | V1 pass, V2 pass, V3 pass |
| C24 | C24/informed/GD.VD/R108#1 profit | finalist | $94,702.01 | $20,385.99 | $486,111.18 | $20,385.99 | 1.2 % [0.4 %, 3.4 %] | 1.2 % | V1 pass, V2 pass, V3 pass |
| C24 | control: N/original | control control: N/original | $94,669.70 | $20,385.99 | $482,700.73 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 3.1 % | V1 pass, V2 pass, V3 pass |
| C24 | control: New L0 | control control: New L0 | $96,883.72 | $20,385.99 | $479,605.18 | $20,385.99 | 0.0 % [0.0 %, 1.5 %] | 7.0 % | V1 pass, V2 pass, V3 pass |
