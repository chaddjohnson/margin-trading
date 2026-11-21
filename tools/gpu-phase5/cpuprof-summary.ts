// gpu-phase5 stage P: a text summary of V8 .cpuprofile files (no visual): per profile the total sampled time and the
// self time by function (top N) and by source file, so that the main thread's and a host worker's hot spots can be read
// as tables.   node --experimental-transform-types tools/gpu-phase5/cpuprof-summary.ts <dir> [--top 40] --out <json>
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const dir = args[0]!;
const top = Number(opt('top', '40'));
const out = opt('out', '');
const repo = path.resolve(import.meta.dirname, '../..');

interface Node {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number };
  children?: number[];
}

const profiles = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.cpuprofile'))
  .map((f) => {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as { nodes: Node[]; samples: number[]; timeDeltas: number[]; startTime: number; endTime: number };
    const byId = new Map(p.nodes.map((n) => [n.id, n]));
    const self = new Map<number, number>();

    p.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (p.timeDeltas[i] ?? 0)));

    const fn = new Map<string, number>();
    const file = new Map<string, number>();
    let total = 0;
    let idle = 0;

    for (const [id, us] of self) {
      const c = byId.get(id)!.callFrame;
      const where = c.url ? `${c.url.replace(`file://${repo}/`, '').replace(/^node:/, 'node:')}` : '(native)';
      const name = `${c.functionName || '(anonymous)'} — ${where}${c.url ? `:${c.lineNumber + 1}` : ''}`;

      total += us;
      if (c.functionName === '(idle)') idle += us;
      fn.set(name, (fn.get(name) ?? 0) + us);
      file.set(where, (file.get(where) ?? 0) + us);
    }
    const rows = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([name, us]) => ({ name, seconds: Math.round(us / 1e4) / 100, shareOfActive: Math.round((us / Math.max(1, total - idle)) * 1000) / 10 }));

    return { file: f, sampledSeconds: Math.round(total / 1e4) / 100, idleSeconds: Math.round(idle / 1e4) / 100, activeSeconds: Math.round((total - idle) / 1e4) / 100, byFunction: rows(fn), bySource: rows(file) };
  })
  .sort((a, b) => b.activeSeconds - a.activeSeconds);

const rec = { kind: 'gpu-phase5 CPU profile summary (self time; percentages of the thread\'s active time)', t: new Date().toISOString(), dir: path.relative(repo, path.resolve(dir)), profiles };

if (out) fs.writeFileSync(out, `${JSON.stringify(rec, null, 1)}\n`);
for (const p of profiles.slice(0, 3)) {
  console.log(`\n== ${p.file}: active ${p.activeSeconds} s, idle ${p.idleSeconds} s`);
  for (const r of p.byFunction.slice(0, 28)) console.log(`${String(r.seconds).padStart(8)} s ${String(r.shareOfActive).padStart(5)} %  ${r.name.slice(0, 150)}`);
}
