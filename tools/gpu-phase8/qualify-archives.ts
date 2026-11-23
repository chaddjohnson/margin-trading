// gpu-phase8 (PROTOCOL.md §6 gate Q1): QUALIFICATION AND RANKING PARITY on the archives of the fixed-seed risk
// mini-optimization (tools/gpu-phase8/job.ts --job mini --risk) — the CPU arm and the GPU arm. ENGINEERING verification
// only (the mini schedule is a parity device on D19, never research evidence). For every archived evaluation (each
// carries the risk envelope under its `|risk` key) both policies of src/risk-envelope/policy.ts are applied on both arms;
// every assessment (checks, decisions, violations) must be identical, and so must the orders a search's promotion and
// selection read: the qualified evaluations by centre net, and the constrained order (violation, then net), per policy.
// Read-only on the two job archives (git-ignored state of research/gpu-phase8/cache/jobs/<job>/).
//   node --no-maglev --experimental-transform-types tools/gpu-phase8/qualify-archives.ts <cpu job> <gpu job> --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';
import { RISK_KEY_SUFFIX } from '../../src/gpu-backend/lab.ts';
import { engineRuntime } from '../../src/gpu-backend/runtime.ts';
import { repoRoot, writeJson } from '../../src/gpu-phase8/context.ts';
import { NL0_CONTROL, RE_EXPERIMENTAL, assess } from '../../src/risk-envelope/policy.ts';

const [a, b] = process.argv.slice(2);
const out = process.argv[process.argv.indexOf('--out') + 1]!;
const load = (job: string) => {
  const f = path.join(repoRoot, 'research/gpu-phase8/cache/jobs', job, 'archive.sqlite');

  if (!fs.existsSync(f)) throw new Error(`no archive for job ${job}`);

  const db = new DatabaseSync(f, { readOnly: true });
  const rows = db.prepare('SELECT key, json FROM points ORDER BY key').all() as { key: string; json: string }[];
  const binding = Object.fromEntries(
    (db.prepare('SELECT k, v FROM meta').all() as { k: string; v: string }[]).map((r) => [r.k, r.v])
  );

  db.close();
  return {
    binding,
    rows: new Map(rows.map((r) => [r.key, decode<{ net: number; dd: number; envelope?: never }>(r.json)]))
  };
};
const A = load(a!);
const B = load(b!);
const keys = [...A.rows.keys()];
const plain = keys.filter((k) => !k.endsWith(RISK_KEY_SUFFIX));
const policies = [NL0_CONTROL, RE_EXPERIMENTAL];
const differing: string[] = [];
const perPolicy: Record<
  string,
  { qualified: number; sameQualifiedOrder: boolean; sameConstrainedOrder: boolean; top3: string[] }
> = {};
const sameKeySets = keys.length === B.rows.size && keys.every((k) => B.rows.has(k));

for (const p of policies) {
  const assessed = (side: typeof A) =>
    keys.map((k) => ({ k, net: side.rows.get(k)!.net, a: assess(side.rows.get(k)!, p, undefined, k) }));
  const xa = assessed(A);
  const xb = sameKeySets ? assessed(B) : [];

  if (sameKeySets) xa.forEach((x, i) => canonHash(x.a) !== canonHash(xb[i]!.a) && differing.push(`${p.id} ${x.k}`));

  const qualified = (xs: typeof xa) =>
    xs
      .filter((x) => x.a.pass)
      .sort((u, v) => v.net - u.net || (u.k < v.k ? -1 : 1))
      .map((x) => x.k);
  const constrained = (xs: typeof xa) =>
    [...xs].sort((u, v) => u.a.violation - v.a.violation || v.net - u.net || (u.k < v.k ? -1 : 1)).map((x) => x.k);
  const qa = qualified(xa);

  perPolicy[p.id] = {
    qualified: qa.length,
    sameQualifiedOrder: sameKeySets && JSON.stringify(qa) === JSON.stringify(qualified(xb)),
    sameConstrainedOrder: sameKeySets && JSON.stringify(constrained(xa)) === JSON.stringify(constrained(xb)),
    top3: qa.slice(0, 3)
  };
}

const control = new Set(keys.filter((k) => assess(A.rows.get(k)!, NL0_CONTROL).pass));
const experimental = new Set(keys.filter((k) => assess(A.rows.get(k)!, RE_EXPERIMENTAL).pass));
const pass =
  sameKeySets &&
  keys.length > 0 &&
  plain.length === 0 &&
  differing.length === 0 &&
  Object.values(perPolicy).every((x) => x.sameQualifiedOrder && x.sameConstrainedOrder);

writeJson(path.join(repoRoot, out), {
  kind: 'gpu-phase8 qualification and ranking parity on the risk mini-optimization archives (Q1)',
  t: new Date().toISOString(),
  runtime: engineRuntime(),
  a: { job: a, binding: A.binding, evaluations: A.rows.size },
  b: { job: b, binding: B.binding, evaluations: B.rows.size },
  sameKeySets,
  evaluationsWithoutRisk: plain.length,
  assessmentsCompared: sameKeySets ? keys.length * policies.length : 0,
  assessmentsDiffering: differing.length,
  examples: differing.slice(0, 10),
  perPolicy,
  decisions: {
    controlPass: control.size,
    experimentalPass: experimental.size,
    controlOnly: [...control].filter((k) => !experimental.has(k)).length,
    experimentalOnly: [...experimental].filter((k) => !control.has(k)).length
  },
  pass
});
console.log(JSON.stringify({ pass, evaluations: keys.length, differing: differing.length, perPolicy }));
process.exitCode = pass ? 0 : 2;
