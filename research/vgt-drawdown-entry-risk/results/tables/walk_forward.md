| Test year | A net / DD | B pick → test net / DD | C pick → test net / DD | D pick → test net / DD | E pick → test net / DD | F pick → test net / DD |
| --- | ---: | --- | --- | --- | --- | --- |
| 2018 | $5,943 / $23,723 | B_skipSlow_20 → $5,943 / $23,723 | C_gate_ret5_6 → −$8,315 / $23,811 | D_upClose_zone → −$14,162 / $28,988 | E_flat15_stab → −$7,533 / $29,032 | F_ret5_6+upClose → −$8,315 / $23,811 |
| 2019 | $15,380 / $9,581 | B_skipFast_10 → $6,201 / $9,581 | C_gate_ret5_6 → $17,384 / $9,581 | D_upClose_rebound → $11,686 / $9,283 | E_score → $22,502 / $10,105 | F_ret5_6+upClose → $17,384 / $9,581 |
| 2020 | $57,597 / $15,660 | B_skipFast_5 → $0 / $0 | C_gate_ret5_6 → $34,055 / $24,987 | D_upClose_rebound → $38,654 / $23,351 | E_score_stab → $26,683 / $15,867 | F_ret5_6+upClose → $53,724 / $23,577 |
| 2021 | −$358 / $10,953 | B_skipSlow_40 → −$358 / $10,953 | C_gate_ret5_6 → −$350 / $10,820 | D_upClose_rebound → −$4,908 / $12,194 | E_score_stab → $0 / $0 | F_ret5_6+upClose → −$350 / $10,820 |
| 2022 | −$165 / $20,570 | B_skipSlow_40 → −$6,638 / $25,421 | C_gate_ret5_6 → −$6,985 / $23,032 | D_upClose_rebound → −$11,051 / $24,525 | E_score_stab → −$8,963 / $27,746 | F_ret5_6+upClose → −$9,068 / $27,662 |

Stitched out-of-sample 2018–2022 (daily increments of each year’s pick):

| Family | Net P&L | Max MTM DD | J = net − DD | Δ J vs A |
| --- | ---: | ---: | ---: | ---: |
| A — Original | $78,398 | $23,723 | $54,675 | – |
| B — Velocity gate | $5,148 | $26,053 | −$20,906 | −$75,580 |
| C — Deterioration gate | $35,790 | $30,513 | $5,277 | −$49,398 |
| D — Stabilization confirmation | $20,218 | $39,906 | −$19,687 | −$74,362 |
| E — Adaptive threshold | $32,689 | $29,032 | $3,657 | −$51,017 |
| F — Simple combination | $53,376 | $27,760 | $25,616 | −$29,059 |

Sensitivity: each test year started flat with that year’s pick (a path a trader could follow):

| Family | Net P&L | Max MTM DD | J | Δ J vs A |
| --- | ---: | ---: | ---: | ---: |
| A — Original | $86,726 | $23,723 | $63,003 | – |
| B — Velocity gate | $7,336 | $25,421 | −$18,085 | −$81,089 |
| C — Deterioration gate | $45,339 | $30,513 | $14,826 | −$48,178 |
| D — Stabilization confirmation | $31,979 | $31,887 | $92 | −$62,911 |
| E — Adaptive threshold | $41,180 | $28,338 | $12,842 | −$50,161 |
| F — Simple combination | $62,925 | $27,760 | $35,165 | −$27,838 |
