// gpu-phase5 stage C (PROTOCOL.md §5): the concurrent dataset-export tests on a REAL door, in a scratch directory of
// this study's cache. NON-OFFICIAL; no evaluation.
//
//   race     Phase 4's isolation test I7 again (4 processes × 25: export the door into ONE shared directory, then have
//            the process's own GPU server LOAD the file — the server reads the whole file and verifies size and
//            checksum), with reader processes that read the shared file continuously and verify every read is the
//            complete expected dataset. --mode atomic uses the engine's exporter (src/gpu-backend/dataset.ts);
//            --mode legacy-inplace publishes the same bytes the way the exporter did before GPU Phase 5 (a plain
//            in-place write of the file and its sidecar) — the regression baseline that reproduces Phase 4's refusals.
//   kill     writer processes exporting into fresh directories are SIGKILLed at random instants; afterwards every
//            target is absent or the complete expected dataset, leftovers are temporary files only, and a restarted
//            export publishes or reuses in every directory.
//   conflict two processes export DIFFERENT datasets (two doors) under one name into one directory at the same instant:
//            exactly one dataset is published; the other writer gets the explicit conflict; a GPU server LOAD of the
//            published file verifies.
//
//   node --experimental-transform-types tools/gpu-phase5/dataset-race.ts race --mode atomic --procs 4 --loops 25 --door D19 --out <json>
//   node --experimental-transform-types tools/gpu-phase5/dataset-race.ts kill --kills 40 --door D19 --out <json>
//   node --experimental-transform-types tools/gpu-phase5/dataset-race.ts conflict --rounds 10 --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { type ChildProcess, spawn } from 'node:child_process';
import { type DoorKey, cacheDir, openDoor, writeJson } from '../../src/gpu-phase5/context.ts';
import { DatasetCacheError, exportDataset, isCompleteDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const [cmd, ...args] = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const doorKey = opt('door', 'D19') as DoorKey;
const mode = opt('mode', 'atomic');
const out = opt('out', '');
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const scratch = path.join(cacheDir, 'dataset-race');
const node = (extra: string[]) =>
  spawn(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', import.meta.filename, ...extra], {
    stdio: ['ignore', 'pipe', 'inherit']
  });
const lastLine = (c: ChildProcess) =>
  new Promise<{ code: number | null; signal: string | null; json: Record<string, unknown> | null }>((resolve) => {
    let buf = '';

    c.stdout!.on('data', (d: Buffer) => (buf += d.toString()));
    c.on('exit', (code, signal) => {
      const line = buf.trim().split('\n').at(-1) ?? '';

      resolve({ code, signal, json: line.startsWith('{') ? (JSON.parse(line) as Record<string, unknown>) : null });
    });
  });
// the publication step of the exporter before GPU Phase 5 (src/gpu-backend/dataset.ts at 0ac3e4e2, lines 181–183)
const legacyPublish = (dir: string, name: string, bytes: Buffer, sidecar: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), bytes);
  fs.writeFileSync(path.join(dir, `${name}.json`), sidecar);
};

// ---------- child modes ----------
if (cmd === 'child-race') {
  const i = Number(opt('child', '0'));
  const dir = opt('dir', '');
  const loops = Number(opt('loops', '25'));
  const door = await openDoor(doorKey, `gpu-phase5 dataset race (child ${i}, no evaluation)`);
  const own = exportDataset(door, path.join(dir, '..', `private-${i}`)); // the expected dataset, in a private directory
  const bytes = fs.readFileSync(own.file);
  const sidecar = fs.readFileSync(own.sidecar, 'utf8');
  const name = path.basename(own.file);
  const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });

  await server.info();

  const rows: { loop: number; outcome: string; detail: string; published?: string }[] = [];

  for (let n = 0; n < loops; n++) {
    let published = 'legacy';

    try {
      if (mode === 'atomic') published = exportDataset(door, dir).published;
      else legacyPublish(dir, name, bytes, sidecar);
    } catch (e) {
      rows.push({ loop: n, outcome: 'export-error', detail: (e as Error).message.split('\n')[0]!.slice(0, 200) });
      continue;
    }
    try {
      const r = (await server.load(path.join(dir, name))) as { sessions?: number; bars?: number[] };
      const now = sha(fs.readFileSync(path.join(dir, name)));
      const same = r.sessions === own.sessions && JSON.stringify(r.bars) === JSON.stringify([own.bars.GDX, own.bars.VGT]);

      rows.push({ loop: n, outcome: same && now === own.sha256 ? 'verified' : 'wrong', detail: `${r.sessions} sessions; file ${now === own.sha256 ? 'equal' : 'different'}`, published });
    } catch (e) {
      rows.push({ loop: n, outcome: 'refused', detail: (e as Error).message.split('\n')[0]!.slice(0, 160), published });
    }
  }
  await server.close();
  process.stdout.write(`${JSON.stringify({ child: i, sha256: own.sha256, rows })}\n`);
  process.exit(0);
}
if (cmd === 'child-read') {
  const file = opt('file', '');
  const expect = opt('expect', '');
  const stop = opt('stop', '');
  let reads = 0;
  let absent = 0;
  let partial = 0;
  let other = 0;
  const sizes = new Set<number>();

  while (!fs.existsSync(stop)) {
    let b: Buffer;

    try {
      b = fs.readFileSync(file);
    } catch {
      absent++;
      continue;
    }
    reads++;
    if (!isCompleteDataset(b)) {
      partial++;
      sizes.add(b.length);
    } else if (sha(b) !== expect) other++;
  }
  process.stdout.write(`${JSON.stringify({ reads, absent, partial, other, partialSizes: [...sizes].slice(0, 6) })}\n`);
  process.exit(0);
}
if (cmd === 'child-loop') {
  const dir = opt('dir', '');
  const door = await openDoor(doorKey, 'gpu-phase5 dataset kill test (writer child, no evaluation)');

  process.stdout.write('ready\n');
  for (let i = 0; ; i++) exportDataset(door, path.join(dir, `k${process.pid}-${i}`));
}
if (cmd === 'child-conflict') {
  const dir = opt('dir', '');
  const which = opt('which', 'D19') as DoorKey;
  const rounds = Number(opt('rounds', '10'));
  const startAt = Number(opt('start', '0'));
  const gap = Number(opt('gap', '400'));
  const door = await openDoor(which, `gpu-phase5 dataset conflict test (writer of ${which}, no evaluation)`);
  const rows: { round: number; outcome: string; sha256?: string }[] = [];

  process.stdout.write('ready\n');
  for (let r = 0; r < rounds; r++) {
    while (Date.now() < startAt + r * gap);
    try {
      const d = exportDataset(door, path.join(dir, `r${r}`), 'SHARED-NAME');

      rows.push({ round: r, outcome: d.published, sha256: d.sha256 });
    } catch (e) {
      rows.push({ round: r, outcome: e instanceof DatasetCacheError ? e.code : `ERROR ${(e as Error).message.slice(0, 120)}` });
    }
  }
  process.stdout.write(`${JSON.stringify({ which, rows })}\n`);
  process.exit(0);
}

// ---------- parent modes ----------
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(scratch, { recursive: true });

const t0 = new Date().toISOString();
let rec: Record<string, unknown> & { pass: boolean };

if (cmd === 'race') {
  const procs = Number(opt('procs', '4'));
  const loops = Number(opt('loops', '25'));
  const readers = Number(opt('readers', '2'));
  const shared = path.join(scratch, 'shared');
  const door = await openDoor(doorKey, 'gpu-phase5 dataset race (parent, no evaluation)');
  const expect = exportDataset(door, path.join(scratch, 'expected'));
  const stop = path.join(scratch, 'stop-readers');

  fs.mkdirSync(shared);

  const readerRuns = Array.from({ length: readers }, () =>
    lastLine(node(['child-read', '--file', path.join(shared, path.basename(expect.file)), '--expect', expect.sha256, '--stop', stop]))
  );
  const results = await Promise.all(
    Array.from({ length: procs }, (_v, i) =>
      lastLine(node(['child-race', '--child', String(i), '--dir', shared, '--door', doorKey, '--loops', String(loops), '--mode', mode]))
    )
  );

  fs.writeFileSync(stop, '');

  const readRes = await Promise.all(readerRuns);
  const all = results.flatMap((r) => (r.json?.rows as { outcome: string; detail: string; published?: string }[]) ?? []);
  const count = (o: string) => all.filter((r) => r.outcome === o).length;
  const leftovers = fs.readdirSync(shared).filter((f) => f.includes('.tmp-'));

  rec = {
    kind: 'gpu-phase5 concurrent dataset export into one shared directory (Phase 4 I7 reproduction, with readers)',
    t0,
    t1: new Date().toISOString(),
    mode,
    door: doorKey,
    datasetBytes: fs.statSync(expect.file).size,
    datasetSha256: expect.sha256,
    procs,
    loops,
    loads: all.length,
    verified: count('verified'),
    refused: count('refused'),
    wrong: count('wrong'),
    exportErrors: count('export-error'),
    created: all.filter((r) => r.published === 'created').length,
    reused: all.filter((r) => r.published === 'reused').length,
    refusalReasons: [...new Set(all.filter((r) => r.outcome === 'refused' || r.outcome === 'export-error').map((r) => r.detail.replace(/\d+/g, 'N')))],
    readers: readRes.map((r) => r.json),
    readerReads: readRes.reduce((a, r) => a + ((r.json?.reads as number) ?? 0), 0),
    readerPartialReads: readRes.reduce((a, r) => a + ((r.json?.partial as number) ?? 0), 0),
    readerOtherContent: readRes.reduce((a, r) => a + ((r.json?.other as number) ?? 0), 0),
    childExitCodes: results.map((r) => r.code),
    temporaryFilesLeft: leftovers.length,
    finalFileSha256Equal: sha(fs.readFileSync(path.join(shared, path.basename(expect.file)))) === expect.sha256,
    pass: false
  };
  rec.pass =
    mode === 'atomic'
      ? rec.verified === procs * loops && rec.refused === 0 && rec.wrong === 0 && rec.exportErrors === 0 && rec.created === 1 && rec.readerPartialReads === 0 && rec.readerOtherContent === 0 && rec.temporaryFilesLeft === 0 && rec.finalFileSha256Equal === true
      : rec.wrong === 0; // the legacy baseline: fail closed (refusals expected), never a wrong dataset accepted
} else if (cmd === 'kill') {
  const kills = Number(opt('kills', '40'));
  const dir = path.join(scratch, 'kill');
  const door = await openDoor(doorKey, 'gpu-phase5 dataset kill test (parent, no evaluation)');
  const expect = exportDataset(door, path.join(scratch, 'expected'));
  const name = path.basename(expect.file);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed / 0x7fffffff);
  let killed = 0;
  const delays: number[] = [];

  fs.mkdirSync(dir);
  for (let n = 0; n < kills; n++)
    await new Promise<void>((resolve) => {
      const c = node(['child-loop', '--dir', dir, '--door', doorKey]);
      const delay = Math.round(rnd() * 400);

      delays.push(delay);
      c.stdout!.once('data', () => setTimeout(() => c.kill('SIGKILL'), delay));
      c.on('exit', (_code, signal) => {
        if (signal === 'SIGKILL') killed++;
        resolve();
      });
    });

  const dirs = fs.readdirSync(dir);
  let complete = 0;
  let absentWithTemporary = 0;
  let absentEmpty = 0;
  let partialTargets = 0;
  let temporaries = 0;
  let partialTemporaries = 0;
  let foreign = 0;

  for (const k of dirs) {
    const files = fs.readdirSync(path.join(dir, k));
    const tmps = files.filter((f) => f.includes('.tmp-'));

    temporaries += tmps.length;
    for (const f of tmps) if (fs.statSync(path.join(dir, k, f)).size !== fs.statSync(expect.file).size && !f.includes('.json.tmp-')) partialTemporaries++;
    foreign += files.filter((f) => !f.includes('.tmp-') && f !== name && f !== `${name}.json`).length;
    if (files.includes(name)) {
      if (sha(fs.readFileSync(path.join(dir, k, name))) === expect.sha256) complete++;
      else partialTargets++;
    } else if (tmps.length) absentWithTemporary++;
    else absentEmpty++;
  }

  // the restart: every directory publishes or reuses, and ends with the complete dataset
  let restarted = 0;

  for (const k of dirs) {
    const d = exportDataset(door, path.join(dir, k));

    if (d.sha256 === expect.sha256 && sha(fs.readFileSync(d.file)) === expect.sha256) restarted++;
  }
  rec = {
    kind: 'gpu-phase5 dataset export: writers killed (SIGKILL) at random instants, then restarted',
    t0,
    t1: new Date().toISOString(),
    door: doorKey,
    datasetBytes: fs.statSync(expect.file).size,
    kills,
    killed,
    killDelaysMsAfterFirstExportStarted: { min: Math.min(...delays), max: Math.max(...delays) },
    directories: dirs.length,
    targetsComplete: complete,
    targetsPartialOrWrong: partialTargets,
    directoriesWithOnlyATemporaryFile: absentWithTemporary,
    directoriesEmpty: absentEmpty,
    temporaryFilesLeftByKilledWriters: temporaries,
    ofThemIncompleteDataFiles: partialTemporaries,
    foreignFiles: foreign,
    restartedAndComplete: restarted,
    pass: killed === kills && partialTargets === 0 && foreign === 0 && restarted === dirs.length && complete > 0
  };
} else if (cmd === 'conflict') {
  const rounds = Number(opt('rounds', '10'));
  const dir = path.join(scratch, 'conflict');
  const gap = 600;
  const a = await openDoor('D19', 'gpu-phase5 dataset conflict test (parent, no evaluation)');
  const b = await openDoor('D21', 'gpu-phase5 dataset conflict test (parent, no evaluation)');
  const ea = exportDataset(a, path.join(scratch, 'expected-a'), 'SHARED-NAME');
  const eb = exportDataset(b, path.join(scratch, 'expected-b'), 'SHARED-NAME');

  fs.mkdirSync(dir);

  const startAt = Date.now() + 15000; // after both children have opened their doors
  const kids = (['D19', 'D21', 'D19', 'D21'] as const).map((which) =>
    lastLine(node(['child-conflict', '--dir', dir, '--which', which, '--rounds', String(rounds), '--start', String(startAt), '--gap', String(gap)]))
  );
  const results = await Promise.all(kids);
  const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });

  await server.info();

  const perRound: Record<string, unknown>[] = [];
  let ok = true;

  for (let r = 0; r < rounds; r++) {
    const file = path.join(dir, `r${r}`, 'SHARED-NAME.gb2ds');
    const published = sha(fs.readFileSync(file));
    const winner = published === ea.sha256 ? 'D19' : published === eb.sha256 ? 'D21' : 'NEITHER';
    const outcomes = results.map((x) => ({ which: x.json?.which, ...((x.json?.rows as { round: number; outcome: string }[]) ?? []).find((q) => q.round === r) }));
    const loaded = (await server.load(file)) as { sessions?: number };
    const sidecar = JSON.parse(fs.readFileSync(`${file}.json`, 'utf8')) as { fileSha256: string; door: string };
    const good =
      winner !== 'NEITHER' &&
      outcomes.every((o) => (o.which === winner ? o.outcome === 'created' || o.outcome === 'reused' : o.outcome === 'DATASET_CACHE_CONFLICT')) &&
      outcomes.filter((o) => o.outcome === 'created').length === 1 &&
      loaded.sessions === (winner === 'D19' ? ea.sessions : eb.sessions) &&
      sidecar.fileSha256 === published &&
      fs.readdirSync(path.dirname(file)).filter((f) => f.includes('.tmp-')).length === 0;

    ok &&= good;
    perRound.push({ round: r, winner, outcomes: outcomes.map((o) => `${String(o.which)}:${String(o.outcome)}`), serverLoadSessions: loaded.sessions, sidecarDoor: sidecar.door, good });
  }
  await server.close();
  rec = {
    kind: 'gpu-phase5 dataset export: two different datasets under one name, written at the same instant',
    t0,
    t1: new Date().toISOString(),
    datasets: { D19: { sha256: ea.sha256, sessions: ea.sessions }, D21: { sha256: eb.sha256, sessions: eb.sessions } },
    rounds,
    winners: { D19: perRound.filter((p) => p.winner === 'D19').length, D21: perRound.filter((p) => p.winner === 'D21').length },
    conflictsReported: results.flatMap((x) => (x.json?.rows as { outcome: string }[]) ?? []).filter((q) => q.outcome === 'DATASET_CACHE_CONFLICT').length,
    perRound,
    pass: ok && results.every((x) => x.code === 0)
  };
} else throw new Error('usage: dataset-race.ts race|kill|conflict …');

fs.rmSync(scratch, { recursive: true, force: true });
if (out) writeJson(out, rec);
console.log(JSON.stringify({ ...rec, perRound: undefined, readers: undefined }));
process.exitCode = rec.pass ? 0 : 2;
