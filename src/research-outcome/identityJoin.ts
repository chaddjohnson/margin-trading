// research-outcome: the IDENTITY JOIN of a study's outcome — attach each finalist's sealed validation record by the
// finalist's stable identity (arm, id), never by a display or governance label, array position or fuzzy match.
//
// Written for the P6-TSLA outcome defect (research/tsla-d1-growth/AMENDMENTS.md D1, DECISION_REGISTER.md U6):
// preDetermination replaced each finalist's `label` with a governance label and outcomeOf then joined the validation rows
// by `label`, so no row matched and every finalist silently became `validation: null`, `c: false`. This module is
// generic (no study import) so the next studies (GDX, MSFT, …) reuse it instead of copying a label join.
//
// Contract (fail closed): every finalist must match EXACTLY ONE eligible row with the same (arm, id). The join throws an
// IdentityJoinError listing every problem at once when
//   - a finalist or an eligible row has no valid identity (arm and id must be non-empty strings);
//   - two finalists share one identity (one underlying finalist with several roles is ONE finalist whose roles are
//     merged; a duplicate means that invariant was broken upstream);
//   - two eligible rows share one identity (a row could be consumed twice, or the wrong one chosen);
//   - a finalist has no row (reported as cross-arm when its id exists under another arm only);
//   - the caller's consistency check (`conflict`) reports a conflict for the matched pair (for example a candidate
//     label that differs from the row's, or malformed pass/fail flags).
// Rows that no finalist claims are allowed (sub-population roles, controls, descriptive subjects) and are returned.
// The result does not depend on the order of the rows; pairs follow the finalists' order.
// Governance labels: report-only text. They are never part of an identity.

export interface Identity {
  readonly arm: string;
  readonly id: string;
}

export class IdentityJoinError extends Error {
  readonly problems: readonly string[];

  constructor(what: string, problems: readonly string[]) {
    super(
      `${what}: identity join failed (${problems.length} problem${problems.length === 1 ? '' : 's'}): ${problems.join('; ')}`
    );
    this.name = 'IdentityJoinError';
    this.problems = problems;
  }
}

// an unambiguous key: no separator can make two different (arm, id) pairs collide
export const identityKey = (x: Identity) => JSON.stringify([x.arm, x.id]);

const nonEmpty = (s: unknown): s is string => typeof s === 'string' && s.length > 0;
export const hasIdentity = (x: unknown): x is Identity =>
  typeof x === 'object' && x !== null && nonEmpty((x as Identity).arm) && nonEmpty((x as Identity).id);

const show = (x: Identity) => `(arm ${x.arm}, id ${x.id})`;

export interface JoinOptions<F extends Identity, R extends Identity> {
  // names the join in error messages, e.g. 'P6-TSLA outcome: C24 finalists ↔ FULL validation rows'
  what?: string;
  // the rows that may represent a finalist (default: every row); excluded rows never match and are only counted
  eligible?: (row: R) => boolean;
  // a non-identity consistency check of a matched pair: a string describes a conflict and fails the join
  conflict?: (finalist: F, row: R) => string | null;
}

export interface JoinResult<F extends Identity, R extends Identity> {
  pairs: { finalist: F; row: R }[];
  unmatchedRows: R[];
  excludedRows: number;
}

export const joinByIdentity = <F extends Identity, R extends Identity>(
  finalists: readonly F[],
  rows: readonly R[],
  opts: JoinOptions<F, R> = {}
): JoinResult<F, R> => {
  const what = opts.what ?? 'outcome join';
  const problems: string[] = [];
  const eligible = opts.eligible ? rows.filter((r) => opts.eligible!(r)) : [...rows];

  // the finalists: valid and unique identities
  const finalistIndex = new Map<string, number[]>();

  finalists.forEach((f, i) => {
    if (!hasIdentity(f)) {
      problems.push(`finalist #${i} has no valid identity (arm and id must be non-empty strings)`);
      return;
    }

    const k = identityKey(f);

    finalistIndex.set(k, [...(finalistIndex.get(k) ?? []), i]);
  });
  for (const [k, at] of finalistIndex)
    if (at.length > 1) {
      const [arm, id] = JSON.parse(k) as [string, string];

      problems.push(
        `duplicate finalist identity ${show({ arm, id })} at #${at.join(', #')}: one identity is one finalist (merge its roles)`
      );
    }

  // the eligible rows: valid and unique identities; the arms under which each id occurs (cross-arm diagnostics)
  const rowIndex = new Map<string, R[]>();
  const armsOfId = new Map<string, Set<string>>();

  eligible.forEach((r, i) => {
    if (!hasIdentity(r)) {
      problems.push(`eligible row #${i} has no valid identity (arm and id must be non-empty strings)`);
      return;
    }

    const k = identityKey(r);

    rowIndex.set(k, [...(rowIndex.get(k) ?? []), r]);
    armsOfId.set(r.id, (armsOfId.get(r.id) ?? new Set()).add(r.arm));
  });
  for (const [k, rs] of rowIndex)
    if (rs.length > 1) {
      const [arm, id] = JSON.parse(k) as [string, string];

      problems.push(`duplicate validation identity ${show({ arm, id })}: ${rs.length} eligible rows`);
    }

  // every finalist matches exactly one row; no row is consumed twice
  const pairs: { finalist: F; row: R }[] = [];
  const consumed = new Set<R>();

  for (const f of finalists) {
    if (!hasIdentity(f)) continue;

    const matches = rowIndex.get(identityKey(f)) ?? [];

    if (matches.length === 0) {
      const elsewhere = [...(armsOfId.get(f.id) ?? [])].filter((a) => a !== f.arm).sort();

      problems.push(
        elsewhere.length
          ? `cross-arm identity: finalist ${show(f)} has no row under arm ${f.arm}; its id occurs under arm ${elsewhere.join(', ')}`
          : `missing validation row for finalist ${show(f)}`
      );
      continue;
    }
    if (matches.length > 1) continue; // reported above as a duplicate row identity

    const row = matches[0]!;

    if (consumed.has(row)) {
      problems.push(`validation row ${show(row)} would be consumed by more than one finalist`);
      continue;
    }
    consumed.add(row);

    const c = opts.conflict?.(f, row) ?? null;

    if (c !== null) {
      problems.push(`conflict for ${show(f)}: ${c}`);
      continue;
    }
    pairs.push({ finalist: f, row });
  }

  if (problems.length) throw new IdentityJoinError(what, problems);
  return {
    pairs,
    unmatchedRows: eligible.filter((r) => !consumed.has(r)),
    excludedRows: rows.length - eligible.length
  };
};
