// The TypeScript layout of protocol v2 (src/gpu-backend/layout.ts) equals the C++ compiler's (gb.h): every struct's
// size and every field's offset, from tools/gpu-backend/layout-dump.cpp compiled with the host g++.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { LAYOUTS } from '../layout.ts';

const repo = path.resolve(import.meta.dirname, '../../..');

test('protocol v3 layout: TypeScript offsets equal the C++ offsetof of gb.h', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-layout-'));
  const bin = path.join(dir, 'layout-dump');

  try {
    execFileSync('g++', ['-std=c++17', '-o', bin, path.join(repo, 'tools/gpu-backend/layout-dump.cpp')]);
    const c = JSON.parse(execFileSync(bin).toString()) as Record<string, Record<string, number>>;

    for (const l of LAYOUTS) {
      const cl = c[l.name];

      assert.ok(cl, `${l.name} missing from the C++ dump`);
      assert.equal(l.size, cl.size, `${l.name} size`);
      for (const [name, off] of Object.entries(l.offsets)) assert.equal(off, cl[name], `${l.name}.${name}`);
      assert.equal(Object.keys(l.offsets).length, Object.keys(cl).length - 1, `${l.name} field count`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
