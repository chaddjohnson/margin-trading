// microbenchmark (estimate only): the main-thread cost of receiving one GPU response of N MB as the client does today
// (chunk list -> Buffer.concat -> Buffer.from copy -> SharedArrayBuffer copy) versus receiving straight into one
// SharedArrayBuffer.
const MB = Number(process.argv[2] ?? 172);
const n = MB * 1024 * 1024;
const chunkSize = 65536;
const src = Buffer.alloc(chunkSize, 7);
const time = (f) => { const t = performance.now(); const r = f(); return [performance.now() - t, r]; };
const cur = [], neu = [];
for (let rep = 0; rep < 6; rep++) {
  // today
  const chunks = [];
  for (let have = 0; have < n; have += chunkSize) chunks.push(Buffer.from(src)); // the stream hands out fresh chunks (not timed as ours)
  const [t1, all] = time(() => Buffer.concat(chunks, chunks.length * chunkSize));
  const [t2, payload] = time(() => Buffer.from(all.subarray(16, n)));
  const [t3] = time(() => { const sab = new SharedArrayBuffer(payload.length); new Uint8Array(sab).set(payload); return sab; });
  cur.push([t1, t2, t3]);
  // straight into one SharedArrayBuffer
  const [t4] = time(() => { const frame = Buffer.from(new SharedArrayBuffer(n)); let at = 0; for (const c of chunks) { c.copy(frame, at); at += c.length; } return frame; });
  neu.push(t4);
}
const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(JSON.stringify({ MB, today: { concatMs: +med(cur.map((x) => x[0])).toFixed(1), copyMs: +med(cur.map((x) => x[1])).toFixed(1), sabMs: +med(cur.map((x) => x[2])).toFixed(1), totalMs: +med(cur.map((x) => x[0] + x[1] + x[2])).toFixed(1) }, direct: { totalMs: +med(neu).toFixed(1) } }));
