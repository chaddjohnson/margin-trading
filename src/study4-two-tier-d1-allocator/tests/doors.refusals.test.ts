// The Study 4 door's record-dependent refusals, whatever the state of the real study: STUDY4_ROOT points the results
// tree at an empty scratch directory under the OS temp directory before the door module loads, so no fold selection
// and no evaluation record exists there. authorise reads no file; nothing under data/ is opened.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

process.env.STUDY4_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'study4-refusals-'));

const { authorise } = await import('../doors.ts');
const { testRoot } = await import('../context.ts');

test('without sealed records the evaluation and H doors refuse before any read', () => {
  const data = path.join(path.parse(process.cwd()).root, 'study4-door-test-not-a-temp-root');

  assert.equal(testRoot, process.env.STUDY4_ROOT);
  assert.throws(() => authorise('evaluation', null, ['VGT'], data), /every sealed fold selection \(F20 missing\)/);
  assert.throws(() => authorise('development', 'H', ['VGT'], data), /after the sealed fold evaluation/);
  assert.equal(authorise('development', 'F20', ['VGT'], data), '2019-12-31');
});
