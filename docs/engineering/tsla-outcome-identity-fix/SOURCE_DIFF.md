# SOURCE_DIFF — TSLA outcome identity fix

The scoped patch against the Priority 6 handoff `421e4c87` is in `source.patch` (in the ZIP). Every new or changed file
at the fix commit is in `source/`, and the pre-fix `outcome.ts` is in `source/original/`.

## Source references

| File | Status | Lines | sha256 (fix commit) | Role |
|---|---|---:|---|---|
| `src/research-outcome/identityJoin.ts` | new | 160 | `885e54093069dbc9b7b36121438774961f3431ebf2d8c788aca0599328d8aaee` | the reusable join by (arm, id), fail closed |
| `src/research-outcome/tests/identityJoin.test.ts` | new | 167 | `9f7d84a0c126ef27d7a9ae7e25ae43ab51cc39520cb0ed57685c96825468b4f9` | 12 tests of the join |
| `src/tsla-d1-growth/outcome.ts` | modified (+121 / −40) | 291 | `d5cee76c23cf1ff57b8be2023a7db75bc086ce61385279a15497e9693722b643` (was `8941a831…`) | the outcome uses the identity join |
| `src/tsla-d1-growth/tests/outcome.test.ts` | new | 536 | `3ee6e2849035aebd388851e0613eb46d87f5663a8f83b7758a60236e3ed37db6` | 25 tests: synthetic, and the sealed replay |
| `tools/tsla-outcome-identity-fix/replay.ts` | new | 333 | `c758a4cc73f855d47080a3ec8fca05435eef94c6072c41d00762b77c72a33b94` | the report-only replay (18 checks) |
| `tools/tsla-outcome-identity-fix/fingerprint.ts` | new | 91 | `7a29c51df8ddb04b94c3ac00d2bb540561f996bad2097bb2e4f817aca4f89f00` | the read-only fingerprint |
| `tools/tsla-outcome-identity-fix/bundle.sh` | new | 115 | (see `SHA256SUMS.txt` and `source/`) | this handoff ZIP |

**Callers.**

- `src/tsla-d1-growth/stages.ts` (`runFreezeSelection`, `runOutcome`) is the only caller of `preDetermination` and
  `outcomeOf`. It is unchanged, and both stages refuse to run for the completed study.
- `src/tsla-d1-growth/main.ts` imports `bands` only, which is unchanged.
- No other module imports `src/tsla-d1-growth/outcome.ts`. The functions of the same name in other studies (for example
  `src/vg-l0-n-successor/successor.ts`) are separate code and untouched.

## The `outcome.ts` change

`git diff 421e4c87 -- src/tsla-d1-growth/outcome.ts`:

```diff
diff --git a/src/tsla-d1-growth/outcome.ts b/src/tsla-d1-growth/outcome.ts
index 27ebef86..2566df28 100644
--- a/src/tsla-d1-growth/outcome.ts
+++ b/src/tsla-d1-growth/outcome.ts
@@ -24,7 +24,15 @@
 //   "not applicable (fixed pairs)"). Priority 5's bands (§12 there): $10,000 ≈ a few percent of a development net and above
 //   the informed replicate noise; $2,500 = Assignment 2/3's frozen risk band. A single historical pair never proves an
 //   architecture superior (standard §3.4): the chronological paths of the arms are reported beside it.
+//
+// IDENTITY (engineering fix after the outcome, DECISION_REGISTER.md U6; disclosure D1): a finalist's identity is
+// (arm, id). preDetermination keeps its sealed output shape — its `label` is the GOVERNANCE label (status text) — and adds
+// `candidateLabel` (the candidate's own label) and `governanceLabel`; outcomeOf joins the validation rows by (arm, id)
+// (src/research-outcome/identityJoin.ts) and fails closed on a missing, duplicate, cross-arm or conflicting identity
+// instead of reporting `validation: null`. The sealed results/outcome.json (label join) is historical evidence and is
+// never regenerated.
 import fs from 'node:fs';
+import { joinByIdentity } from '../research-outcome/identityJoin.ts';
 import { type ArmKey, type CutoffKey, armName, ceiling } from './context.ts';
 import type { Evidence } from './qualify.ts';
 import { originalOrder, rolesOf } from './select.ts';
@@ -35,7 +43,7 @@ export const nominatingArms: readonly ArmKey[] = ['D', 'G', 'C', 'J', 'S'];
 export const bands = { profitNet: 10_000, profitRobust: 5_000, risk: 2_500 };
 
 export interface Finalist {
-  label: string;
+  label: string; // the candidate's own label (its member label); the identity is (arm, id)
   id: string;
   arm: ArmKey;
   roles: string[];
@@ -138,9 +146,61 @@ export const compare = (cut: CutoffKey, k: ArmKey, against: { arm: ArmKey; label
   };
 };
 
-export const preDetermination = (finalists: readonly Finalist[], procedures: readonly { population: string; verdict: string; supported: boolean }[]) => {
+type Procedure = { population: string; verdict: string; supported: boolean };
+
+// a finalist with its development (a) and chronological (b) flags, as sealed in FROZEN_SELECTION.json's preDetermination.
+// `label` keeps its sealed meaning there: the GOVERNANCE label. `candidateLabel` / `governanceLabel` are added by the
+// identity fix (absent from records sealed before it); neither is ever an identity.
+export interface GovernedFinalist extends Finalist {
+  armName: string;
+  primary: boolean;
+  chronology: string;
+  chronologicallySupported: boolean;
+  a: boolean;
+  b: boolean;
+  candidateLabel?: string;
+  governanceLabel?: string;
+}
+
+export const governanceLabelOf = (
+  qualified: boolean,
+  failed: readonly string[],
+  primary: boolean,
+  supported: boolean
+) =>
+  !qualified
+    ? `fails ${failed.join(', ')} at C24 (development)`
+    : !primary
+      ? 'descriptive role holder (not a nominee)'
+      : supported
+        ? 'development-qualified and chronologically supported (validation pending)'
+        : 'development-qualified, NO chronological support: not a deployment-qualified candidate without an explicit user decision';
+
+export const governedFinalists = (
+  finalists: readonly Finalist[],
+  procedures: readonly Procedure[]
+): GovernedFinalist[] =>
+  finalists.map((f) => {
+    const proc = procedures.find((p) => p.population === f.arm);
+    const primary = f.roles.includes(`primary ${f.arm}`);
+    const governance = governanceLabelOf(f.qualified, f.failed, primary, proc?.supported ?? false);
+
+    return {
+      ...f,
+      armName: armName[f.arm],
+      primary,
+      chronology: proc ? proc.verdict : 'no procedure verdict',
+      chronologicallySupported: primary && (proc?.supported ?? false),
+      a: f.qualified,
+      b: primary && (proc?.supported ?? false),
+      label: governance,
+      candidateLabel: f.label,
+      governanceLabel: governance
+    };
+  });
+
+export const preDetermination = (finalists: readonly Finalist[], procedures: readonly Procedure[]) => {
   const cut: CutoffKey = 'C24';
-  const supportOf = (arm: ArmKey) => procedures.find((p) => p.population === arm);
   const prim = (arm: ArmKey) => finalists.find((f) => f.arm === arm && f.roles.includes(`primary ${arm}`)) ?? null;
   const standalone = (['D', 'G'] as const).map((a) => prim(a)).filter((f): f is Finalist => f !== null && f.qualified);
   const bestStandalone = standalone.sort((a, b) => b.centreNet - a.centreNet || (a.label < b.label ? -1 : 1))[0] ?? null;
@@ -149,28 +209,7 @@ export const preDetermination = (finalists: readonly Finalist[], procedures: rea
 
   return {
     rule: 'PROTOCOL.md §12 (outcome.ts): (a) Q1–Q6 at C24; (b) the arm’s primary and its independent chronological verdict supported; (c) V1–V3 on FULL',
-    finalists: finalists.map((f) => {
-      const proc = supportOf(f.arm);
-      const primary = f.roles.includes(`primary ${f.arm}`);
-
-      return {
-        ...f,
-        armName: armName[f.arm],
-        primary,
-        chronology: proc ? proc.verdict : 'no procedure verdict',
-        chronologicallySupported: primary && (proc?.supported ?? false),
-        a: f.qualified,
-        b: primary && (proc?.supported ?? false),
-        label:
-          !f.qualified
-            ? `fails ${f.failed.join(', ')} at C24 (development)`
-            : !primary
-              ? 'descriptive role holder (not a nominee)'
-              : proc?.supported
-                ? 'development-qualified and chronologically supported (validation pending)'
-                : 'development-qualified, NO chronological support: not a deployment-qualified candidate without an explicit user decision'
-      };
-    }),
+    finalists: governedFinalists(finalists, procedures),
     comparisons: {
       bestStandalone: bestStandalone ? { arm: bestStandalone.arm, label: bestStandalone.label } : null,
       combinedVsStandalone: (['C', 'J', 'S'] as const).map((k) => compare(cut, k, bestStandalone ? { arm: bestStandalone.arm, label: bestStandalone.label } : null)),
@@ -180,28 +219,70 @@ export const preDetermination = (finalists: readonly Finalist[], procedures: rea
   };
 };
 
-export const outcomeOf = (
-  pre: ReturnType<typeof preDetermination>,
-  rows: readonly { label: string; id: string; arm: ArmKey; validation: { V1: boolean; V2: boolean; V3: boolean } }[]
+export interface ValidationFlags {
+  V1: boolean;
+  V2: boolean;
+  V3: boolean;
+}
+// a row of the sealed validation record (results/validation/validation.json): `label` is the subject's candidate label;
+// `kind` 'selected' rows represent C24 subjects, 'control' rows the external controls (never finalists)
+export interface ValidationRow {
+  label: string;
+  id: string;
+  arm: ArmKey;
+  kind?: string;
+  validation: ValidationFlags;
+}
+
+const flagsProblem = (v: unknown) =>
+  typeof v === 'object' &&
+  v !== null &&
+  (['V1', 'V2', 'V3'] as const).every((k) => typeof (v as ValidationFlags)[k] === 'boolean')
+    ? null
+    : `malformed V1–V3 in the validation row (${JSON.stringify(v ?? null)})`;
+
+// the canonical order of the outcome's lists: arm order, then id (independent of the input order)
+const byArmThenId = (x: { arm: ArmKey; id: string }, y: { arm: ArmKey; id: string }) =>
+  nominatingArms.indexOf(x.arm) - nominatingArms.indexOf(y.arm) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
+
+export const outcomeOf = <P extends { finalists: readonly GovernedFinalist[]; comparisons: unknown }>(
+  pre: P,
+  rows: readonly ValidationRow[]
 ) => {
-  const fin = pre.finalists.map((f) => {
-    const row = rows.find((r) => r.label === f.label && r.arm === f.arm);
-    const v = row?.validation ?? null;
-    const c = v ? v.V1 && v.V2 && v.V3 : false;
+  const { pairs } = joinByIdentity(pre.finalists, rows, {
+    what: 'P6-TSLA outcome (PROTOCOL §12): C24 finalists ↔ FULL validation rows by (arm, id)',
+    eligible: (r) => r.kind === undefined || r.kind === 'selected',
+    conflict: (f, r) =>
+      typeof r.label !== 'string' || r.label.length === 0
+        ? 'the validation row has no candidate label'
+        : f.candidateLabel !== undefined && f.candidateLabel !== r.label
+          ? `candidate label conflict: finalist "${f.candidateLabel}", validation row "${r.label}"`
+          : flagsProblem(r.validation)
+  });
+  const fin = pairs.map(({ finalist: f, row }) => {
+    const v: ValidationFlags = { V1: row.validation.V1, V2: row.validation.V2, V3: row.validation.V3 };
+    const c = v.V1 && v.V2 && v.V3;
 
-    return { ...f, validation: v, c, candidate: f.a && f.b && c, developmentOnly: f.a && f.primary && !f.b && c };
+    return {
+      ...f,
+      candidateLabel: row.label,
+      validation: v,
+      c,
+      candidate: f.a && f.b && c,
+      developmentOnly: f.a && f.primary && !f.b && c
+    };
   });
-  const candidates = fin.filter((f) => f.candidate);
-  const devOnly = fin.filter((f) => f.developmentOnly);
+  const candidates = fin.filter((f) => f.candidate).sort(byArmThenId);
+  const devOnly = fin.filter((f) => f.developmentOnly).sort(byArmThenId);
 
   return {
     finalists: fin,
-    candidates: candidates.map((f) => ({ arm: f.arm, label: f.label, id: f.id })),
-    developmentOnly: devOnly.map((f) => ({ arm: f.arm, label: f.label, id: f.id })),
-    comparisons: pre.comparisons,
+    candidates: candidates.map((f) => ({ arm: f.arm, label: f.candidateLabel, id: f.id })),
+    developmentOnly: devOnly.map((f) => ({ arm: f.arm, label: f.candidateLabel, id: f.id })),
+    comparisons: pre.comparisons as P['comparisons'],
     outcome: candidates.length
-      ? `TSLA RESEARCH CANDIDATE(S) FOR THE USER'S REVIEW: ${candidates.map((f) => `${f.arm} ${f.label}`).join('; ')} (development-qualified, chronologically supported, V1–V3 pass on previously examined 2025–2026 history; research nomination only — nothing adopted or deployed)`
-      : `NO QUALIFYING TSLA CANDIDATE: no arm primary is development-qualified AND chronologically supported AND passes V1–V3${devOnly.length ? `; development-qualified without chronological support (not deployment-qualified without an explicit user decision): ${devOnly.map((f) => `${f.arm} ${f.label}`).join('; ')}` : ''}`,
+      ? `TSLA RESEARCH CANDIDATE(S) FOR THE USER'S REVIEW: ${candidates.map((f) => `${f.arm} ${f.candidateLabel}`).join('; ')} (development-qualified, chronologically supported, V1–V3 pass on previously examined 2025–2026 history; research nomination only — nothing adopted or deployed)`
+      : `NO QUALIFYING TSLA CANDIDATE: no arm primary is development-qualified AND chronologically supported AND passes V1–V3${devOnly.length ? `; development-qualified without chronological support (not deployment-qualified without an explicit user decision): ${devOnly.map((f) => `${f.arm} ${f.candidateLabel}`).join('; ')}` : ''}`,
     ceiling: `the $35,000 (35 % of the fixed $100,000 allocation) marked-DD ceiling is a research criterion on historical paths, never an enforceable future loss limit (${ceiling})`
   };
 };
```

The essential change:

- **Removed.** `rows.find((r) => r.label === f.label && r.arm === f.arm)` and `row?.validation ?? null`.
- **Added.** `joinByIdentity(pre.finalists, rows, { eligible: selected rows only, conflict: candidate-label / V1–V3
  checks })`. It returns exactly one row per finalist, or it throws `IdentityJoinError`.
- **Moved without behavioural change.** The governance-label mapping of `preDetermination`, now in `governedFinalists`
  and `governanceLabelOf`. The test "preDetermination’s finalists recomputed from the frozen finalists equal the sealed
  ones field for field" checks this on the sealed TSLA data.
