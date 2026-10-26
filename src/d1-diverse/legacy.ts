// `legacy-check` (PROTOCOL.md §3): the October 25 study stays checkable at its original code state without relaxing its
// guard. Its code manifest is recomputed from the git object store at its commit — the same selection rule and the
// same key order as its own walker (directories depth first, names sorted at each level) — and must equal its
// amendment head; every tracked file under the protected trees must equal HEAD with nothing untracked beside them; and
// its record hash lists must verify. Read-only; can be run at any time.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { legacy, log, nowIso, protocolFreezeFile, stageDir, writeJson } from './context.ts';
import { codeState } from './freeze.ts';

const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });

interface Tree {
  dirs: Map<string, Tree>;
  files: string[];
}

// The October 25 study's codeFiles() order rebuilt from a list of paths.
export const legacyCodeOrder = (paths: readonly string[], root = 'src', reportPath = 'src/d1-robust/report.ts') => {
  const tree: Tree = { dirs: new Map(), files: [] };

  for (const full of paths) {
    const parts = full.split('/').slice(1); // drop 'src'
    let node = tree;

    for (const part of parts.slice(0, -1)) {
      if (!node.dirs.has(part)) {
        node.dirs.set(part, { dirs: new Map(), files: [] });
      }

      node = node.dirs.get(part)!;
    }

    node.files.push(parts.at(-1)!);
  }

  const out: string[] = [];
  const walk = (node: Tree, dir: string) => {
    for (const name of [...node.dirs.keys(), ...node.files].sort()) {
      const full = path.join(dir, name);

      if (node.dirs.has(name)) {
        if (name !== 'tests' && name !== 'generated') {
          walk(node.dirs.get(name)!, full);
        }
      } else if (name.endsWith('.ts') && full !== reportPath) {
        out.push(full);
      }
    }
  };

  walk(tree, root);

  return out;
};

export const legacyManifestAt = (commit: string) => {
  const paths = git(['ls-tree', '-r', '--name-only', commit, 'src']).split('\n').filter(Boolean);
  const files = legacyCodeOrder(paths);
  const hashes = Object.fromEntries(
    files.map((file) => [
      file,
      createHash('sha256')
        .update(execFileSync('git', ['cat-file', 'blob', `${commit}:${file}`], { maxBuffer: 1 << 28 }))
        .digest('hex')
    ])
  );

  return {
    digest: createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),
    files: Object.keys(hashes).length
  };
};

const verifyHashList = async (file: string) => {
  if (!(await fs.pathExists(file))) {
    return { file, checked: 0, failures: ['missing'] };
  }

  const failures: string[] = [];
  let checked = 0;

  for (const line of (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean)) {
    const [expected, ...rest] = line.trim().split(/\s+/);
    const target = rest.join(' ');
    const resolved = (await fs.pathExists(target)) ? target : path.join(legacy.researchRoot, target);

    checked++;

    if (!(await fs.pathExists(resolved))) {
      failures.push(`${target}: missing`);
      continue;
    }

    const actual = createHash('sha256')
      .update(await fs.readFile(resolved))
      .digest('hex');

    if (actual !== expected) {
      failures.push(`${target}: differs`);
    }
  }

  return { file, checked, failures };
};

export const runLegacyCheck = async () => {
  const manifest = legacyManifestAt(legacy.commit);
  const diff = git(['status', '--porcelain', '--', ...legacy.protectedTrees])
    .split('\n')
    .filter(Boolean);
  const lists = await Promise.all(
    ['records.sha256', 'jsonl-records.sha256'].map((name) =>
      verifyHashList(path.join(legacy.researchRoot, 'results', name))
    )
  );
  const record = {
    checkedAt: nowIso(),
    codeState: await codeState(),
    commit: legacy.commit,
    head: git(['rev-parse', 'HEAD']).trim(),
    manifest: {
      ...manifest,
      expected: legacy.codeManifest,
      expectedFiles: legacy.codeFiles,
      equal: manifest.digest === legacy.codeManifest
    },
    protectedTrees: { paths: legacy.protectedTrees, changesAgainstHead: diff, clean: diff.length === 0 },
    hashLists: lists.map((item) => ({
      ...item,
      failures: item.failures.slice(0, 20),
      pass: item.failures.length === 0
    })),
    pass:
      manifest.digest === legacy.codeManifest &&
      manifest.files === legacy.codeFiles &&
      diff.length === 0 &&
      lists.every((item) => item.failures.length === 0)
  };

  // Before the freeze the record is bound by it; afterwards each check writes its own file (the bound one never changes).
  const frozen = await fs.pathExists(protocolFreezeFile);
  const file = frozen
    ? stageDir('legacy', `legacy-check-after-freeze-${nowIso().replace(/[:.]/g, '-')}.json`)
    : stageDir('legacy', 'legacy-check.json');

  await writeJson(file, record);
  log(
    `legacy-check: manifest ${manifest.digest.slice(0, 12)} (${manifest.files} files) ${record.manifest.equal ? '=' : '≠'} ${legacy.codeManifest.slice(0, 12)}; protected trees ${record.protectedTrees.clean ? 'clean' : 'CHANGED'}; hash lists ${lists.map((item) => `${item.checked - item.failures.length}/${item.checked}`).join(', ')}`
  );

  if (!record.pass) {
    throw new Error('legacy-check failed: the October 25 study is not intact (see results/legacy/legacy-check.json)');
  }

  return record;
};
