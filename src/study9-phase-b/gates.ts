// Stage and door preconditions (PROTOCOL.md §2.3, §3.2), intrinsic to each door key: door.ts calls doorGate before any
// bar is read, and every gate re-verifies the local hash chain and (after the freeze) the integrity pins, failing
// closed. Phase order: protocol → parity → search (35 jobs) → qualify (35) → selection → audit → test-F19 → test-F20 →
// test-F21 → test-F23 → test-F24 → test-F24-confirm → (post-test, report-only) slice, preference and diagnostics.
// The decision itself is the pure function gateDecision (unit-tested on synthetic states, review m8).
import fs from 'fs-extra';
import {
  type FoldKey,
  foldKeys,
  frozenSelectionFile,
  parityFile,
  protocolFreezeFile,
  resultFile,
  smoke,
  testOrder
} from './context.ts';
import { requireIntegrity } from './integrity.ts';
import { doorLogLines, readChain, readSealed, requirePhase } from './records.ts';

export const protocolFrozen = () => fs.pathExists(protocolFreezeFile);

export const requireProtocolFrozen = async () => {
  if (!(await protocolFrozen())) throw new Error('the protocol is not frozen (freeze-protocol)');

  await requirePhase('protocol');

  return readSealed<{ protocol: { sha256: string } }>(protocolFreezeFile);
};

export const requireParity = async () => {
  await requireProtocolFrozen();
  await requirePhase('parity');

  const parity = await readSealed<{ passed: boolean }>(parityFile);

  if (parity.passed !== true) throw new Error(`${parityFile}: parity did not pass`);
};

export interface GateState {
  smoke: boolean;
  frozen: boolean;
  sealed: ReadonlySet<string>; // sealed chain phases
  parityPassed: boolean;
  testTrace?: string; // a selection file, a test record or a test-door log line
}

// null = the door may open; otherwise the refusal reason.
export const gateDecision = (key: string, state: GateState): string | null => {
  if (state.smoke) return key.startsWith('smoke-') ? null : `smoke mode opens only smoke doors (asked for ${key})`;
  if (key.startsWith('smoke-')) return 'smoke doors exist only in smoke mode';
  if (key === 'pilot') return state.frozen ? 'the pilot is a pre-freeze door; the protocol is frozen' : null;
  if (!state.frozen || !state.sealed.has('protocol')) return `door ${key}: the protocol is not frozen`;

  if (key.startsWith('parity'))
    return state.sealed.has('parity') ? `door ${key} opens only inside the parity stage` : null;

  if (key.startsWith('search-')) {
    if (!state.sealed.has('parity') || !state.parityPassed) return `door ${key}: parity is not sealed and passed`;
    if (state.sealed.has('selection')) return `door ${key} is closed: the selection is sealed`;
    if (state.testTrace) return `door ${key} is closed: ${state.testTrace}`;
    return null;
  }

  if (key.startsWith('test-')) {
    const fold = key.slice('test-'.length) as FoldKey;

    if (!(foldKeys as readonly string[]).includes(fold)) return `unknown door ${key}`;
    if (!state.sealed.has('selection') || !state.sealed.has('audit'))
      return `door ${key}: selection and audit must be sealed`;

    for (const earlier of testOrder.slice(0, testOrder.indexOf(fold as (typeof testOrder)[number]))) {
      if (!state.sealed.has(`test-${earlier}`))
        return `door ${key}: the documented order requires test-${earlier} first`;
    }

    return null;
  }

  if (key === 'slice' || key === 'post')
    return state.sealed.has('test-F24-confirm') ? null : `door ${key}: test-F24-confirm is not sealed`;

  return `unknown door ${key}`;
};

// PROTOCOL.md §8.3 (review M2): the audit report must hold exactly one result line, "Result: CLEARED", and no negated
// or blocking result anywhere.
export const auditCleared = (text: string) => {
  const results = text.split('\n').filter((line) => /^Result:/.test(line));

  return results.length === 1 && results[0]!.trim() === 'Result: CLEARED' && !/NOT\s+CLEARED|UNCLEARED/i.test(text);
};

// Any trace of the selection or of a test door (file or door-log line) closes the training doors for good.
const anyTestTrace = async () => {
  if (await fs.pathExists(frozenSelectionFile)) return `${frozenSelectionFile} exists`;
  if (await fs.pathExists(resultFile('test'))) return `${resultFile('test')} exists`;

  const opened = (await doorLogLines()).find((line) => (JSON.parse(line) as { door: string }).door.startsWith('test-'));

  return opened ? 'the door log records a test-door opening' : undefined;
};

export const doorGate = async (key: string) => {
  if (!smoke && !key.startsWith('smoke-') && key !== 'pilot') {
    await requireIntegrity(`door ${key}`, { canonical: key === 'test-F24' || key === 'slice' || key === 'post' });
    await requireProtocolFrozen();
  }

  const sealed = smoke ? new Set<string>() : new Set((await readChain()).map((entry) => entry.phase));
  const parityPassed =
    sealed.has('parity') && (await fs.pathExists(parityFile))
      ? (await readSealed<{ passed: boolean }>(parityFile)).passed === true
      : false;
  const reason = gateDecision(key, {
    smoke,
    frozen: await protocolFrozen(),
    sealed,
    parityPassed,
    testTrace: key.startsWith('search-') ? await anyTestTrace() : undefined
  });

  if (reason) throw new Error(reason);
};
