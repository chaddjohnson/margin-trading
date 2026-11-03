#!/usr/bin/env python3
"""Proof of exactly what amendment A5 changed (final review finding 2), from the repository root:

    python3 -I research/study4-two-tier-d1-allocator/scripts/a5_diff_proof.py

No copy of the evaluation code as first frozen was kept. This script undoes the A5 edits in memory (the three text
changes below, nothing else) and checks that each result hashes to the sha256 recorded for that file in the superseded
first evaluation freeze (results/superseded/evaluation-freeze1/CODE_FREEZE_EVALUATION.json). Matching hashes prove that
the A5 diff is exactly these edits; in particular `floorsMet` in verify.ts (which feeds V2) did not change. It also checks
that the current files match the current evaluation freeze and that no other file differs between the two freezes.
Reads source files and freeze records only.
"""
import hashlib
import json
import sys

RES = 'research/study4-two-tier-d1-allocator/results'
SRC = 'src/study4-two-tier-d1-allocator'
old = json.load(open(f'{RES}/superseded/evaluation-freeze1/CODE_FREEZE_EVALUATION.json'))['hashes']
new = json.load(open(f'{RES}/CODE_FREEZE_EVALUATION.json'))['hashes']
sha = lambda text: hashlib.sha256(text.encode()).hexdigest()
ok = True


def cut(text, start, end_marker, keep_end=True):
    i = text.index(start)
    j = text.index(end_marker, i)
    return text[:i] + text[j if keep_end else j + len(end_marker):]


# evaluation.ts: the perturbation context stand-in (the defect fix)
e = open(f'{SRC}/evaluation.ts').read()
e0 = e.replace('const ctxLike = perturbContext(world, fold);',
               'const ctxLike = { info: perturbInfo(world, fold), spec: { rho: rhoOf(world, fold) } } as unknown as Context;')
e0 = cut(e0, '\n\n// The part of a development Context that the band functions read', 'as unknown as Context;', keep_end=False)

# main.ts: freeze-evaluation must name its amendment once an earlier evaluation freeze was superseded (bookkeeping)
m = open(f'{SRC}/main.ts').read()
m0 = cut(m, '      // a later evaluation freeze (after an earlier one was superseded) must name its amendment (A5)\n',
         '      const sealed = writeSealed(codeFreezeEvaluationFile(), {')
m0 = m0.replace("        stage: 'CODE_FREEZE_EVALUATION',\n        amendment: previous ? args[0] : null,\n"
                "        supersedes: previous ? previous.bodyHash : null,\n", "        stage: 'CODE_FREEZE_EVALUATION',\n")

# verify.ts: one added check (the superseded freeze is kept and named); nothing else
v = open(f'{SRC}/verify.ts').read()
v0 = cut(v, "  attempt('superseded evaluation freeze (A5) kept, sealed and named by the current one', () => {",
         "  attempt('parity records named by the code freeze'")

for name, current, reverted in [('evaluation.ts', e, e0), ('main.ts', m, m0), ('verify.ts', v, v0)]:
    key = f'{SRC}/{name}'
    a, b = sha(reverted) == old[key], sha(current) == new[key]
    ok &= a and b
    print(f"{name}: reverted = first freeze {'yes' if a else 'NO'}; current = current freeze {'yes' if b else 'NO'}")

others = sorted(k for k in set(old) | set(new) if old.get(k) != new.get(k) and not k.endswith(('/evaluation.ts', '/main.ts', '/verify.ts')))
print('other files differing between the two freezes:', others or 'none')
ok &= not others
print('A5 diff proven' if ok else 'A5 diff NOT proven')
sys.exit(0 if ok else 1)
