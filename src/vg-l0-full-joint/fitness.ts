// Neighbourhood statistics, feasibility and the search objectives (PROTOCOL.md §7–§9; NL0 1.0.0 §3.3, §3.5) — Assignment
// 2's (src/vg-l0-risk-families/fitness.ts), reused UNCHANGED: Priority 3's nbStats (robust = ½ median + ½ p10 of the
// neighbours' net; p90 DD with linear interpolation between order statistics); feasibility = centre net > 0, centre DD ≤
// $35,000, the rung's neighbourhood p90 DD ≤ $35,000, a D1 book and Growth·VGT both funded at the centre; centre-first
// fidelity (an implausible centre gets no neighbours and the unmeasured penalty 1); objectives (−centre net, −robust net,
// p90 DD).
export * from '../vg-l0-risk-families/fitness.ts';
