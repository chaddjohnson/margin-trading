// E4 door guards (PROTOCOL.md §9) on a SYNTHETIC record state: the strict fold order C19 → C21 → C24, interval doors
// only behind sealed AND committed selections, FULL once behind the selection, the frozen-selection manifest and the
// authorization, engineering only on the training doors and (beyond D19) only before the freeze.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freezeFile } from '../context.ts';
import { type DoorState, doorGuard, frozenSelectionFile, fullAuthorizationFile, intervalFile, selectionFile } from '../doors.ts';

const state = (sealed: string[], uncommitted: string[] = []): DoorState => ({
  exists: (f) => sealed.includes(f),
  sealed: (f) => sealed.includes(f),
  committed: (f) => sealed.includes(f) && !uncommitted.includes(f)
});
const ok = (f: () => void) => assert.doesNotThrow(f);
const no = (f: () => void, re: RegExp = /./) => assert.throws(f, re);

test('training doors follow the fold order', () => {
  ok(() => doorGuard('D19', 'training', 'p', state([])));
  no(() => doorGuard('D21', 'training', 'p', state([])), /C19/);
  no(() => doorGuard('D21', 'training', 'p', state([intervalFile('C19')], [intervalFile('C19')])), /not committed/);
  ok(() => doorGuard('D21', 'training', 'p', state([intervalFile('C19')])));
  no(() => doorGuard('D24', 'training', 'p', state([intervalFile('C19')])), /C21/);
  ok(() => doorGuard('D24', 'training', 'p', state([intervalFile('C21')])));
  no(() => doorGuard('D23', 'training', 'p', state([])));
  no(() => doorGuard('FULL', 'training', 'p', state([])));
});

test('interval doors only behind the sealed and committed selection of their fold', () => {
  no(() => doorGuard('D21', 'interval', 'p', state([])), /C19/);
  no(() => doorGuard('D21', 'interval', 'p', state([selectionFile('C19')], [selectionFile('C19')])), /not committed/);
  ok(() => doorGuard('D21', 'interval', 'p', state([selectionFile('C19')])));
  no(() => doorGuard('D23', 'interval', 'p', state([selectionFile('C19')])), /C21/);
  ok(() => doorGuard('D23', 'interval', 'p', state([selectionFile('C21')])));
  no(() => doorGuard('D24', 'interval', 'p', state([selectionFile('C21')])));
  no(() => doorGuard('FULL', 'interval', 'p', state([selectionFile('C24')])));
});

test('FULL once: the C24 selection, the frozen selection and the authorization; never after the sealed validation', () => {
  const all = [selectionFile('C24'), frozenSelectionFile, fullAuthorizationFile];

  no(() => doorGuard('FULL', 'validation', 'p', state([selectionFile('C24')])));
  no(() => doorGuard('FULL', 'validation', 'p', state(all, [fullAuthorizationFile])), /not committed/);
  ok(() => doorGuard('FULL', 'validation', 'p', state(all)));
  no(() => doorGuard('FULL', 'validation', 'p', state([...all, intervalFile('C24')])), /once/);
  no(() => doorGuard('D24', 'validation', 'p', state(all)));
  // diagnostics read FULL only after the sealed, committed validation
  no(() => doorGuard('FULL', 'diagnostic', 'p', state(all)));
  ok(() => doorGuard('FULL', 'diagnostic', 'p', state([...all, intervalFile('C24')])));
});

test('engineering reads D19 always, D21 / D24 only before the freeze, never D23 or FULL; a purpose is required', () => {
  ok(() => doorGuard('D21', 'engineering', 'p', state([])));
  ok(() => doorGuard('D24', 'engineering', 'p', state([])));
  no(() => doorGuard('D21', 'engineering', 'p', state([freezeFile])), /before the freeze/);
  ok(() => doorGuard('D19', 'engineering', 'p', state([freezeFile])));
  no(() => doorGuard('D23', 'engineering', 'p', state([])));
  no(() => doorGuard('FULL', 'engineering', 'p', state([])));
  no(() => doorGuard('D19', 'training', '', state([])), /purpose/);
});
