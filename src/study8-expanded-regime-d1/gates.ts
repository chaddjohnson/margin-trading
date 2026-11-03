// Stage and door preconditions (PROTOCOL.md §2.3, §3.2), intrinsic to each door key: data.ts calls doorGate before any
// bar is read. Every gate re-verifies the local hash chain (records.ts) and fails closed. Phases, in order:
// protocol → parity → search (all 30 jobs) → qualify (all 30) → selection → audit → test-F19 → test-F20 → test-F21 →
// test-F23 → test-F24 (the one-time primary evaluation) → test-F24-confirm. After the freeze every door also re-checks
// the integrity pins (integrity.ts: code, engine, data and constants).
import fs from 'fs-extra';
import { foldKeys, frozenSelectionFile, parityFile, protocolFreezeFile, resultFile } from './context.ts';
import { requireIntegrity } from './integrity.ts';
import { doorLogLines, phaseSealed, readSealed, requirePhase, verifyChain } from './records.ts';

export const protocolFrozen = () => fs.pathExists(protocolFreezeFile);

export const requireProtocolFrozen = async () => {
  if (!(await protocolFrozen())) throw new Error('the protocol is not frozen (npm run study8 -- freeze-protocol)');

  await requirePhase('protocol');

  return readSealed<{ protocol: { sha256: string } }>(protocolFreezeFile);
};

export const requireParity = async () => {
  await requireProtocolFrozen();
  await requirePhase('parity');

  const parity = await readSealed<{ passed: boolean }>(parityFile);

  if (parity.passed !== true) throw new Error(`${parityFile}: parity did not pass`);
};

// Any trace of the selection or of a test door (file or door-log line) closes the training doors for good.
const anyTestTrace = async () => {
  if (await fs.pathExists(frozenSelectionFile)) return `${frozenSelectionFile} exists`;
  if (await fs.pathExists(resultFile('test'))) return `${resultFile('test')} exists`;

  const opened = (await doorLogLines()).find((line) => (JSON.parse(line) as { door: string }).door.startsWith('test-'));

  return opened ? 'the door log records a test-door opening' : undefined;
};

// The documented evaluation order of the test doors.
export const testOrder = ['F19', 'F20', 'F21', 'F23', 'F24'] as const;

export const doorGate = async (key: string) => {
  if (key === 'pilot-F24') {
    if (await protocolFrozen()) throw new Error('door pilot-F24 is a pre-freeze door; the protocol is frozen');
    return;
  }

  await requireIntegrity(`door ${key}`);

  if (key.startsWith('parity')) {
    await requireProtocolFrozen();
    if (await phaseSealed('parity')) throw new Error(`door ${key} opens only inside the parity stage`);
    return;
  }

  if (key.startsWith('search-')) {
    await requireParity();
    // no search or training-door evidence after the selection is sealed (no re-optimization loop)
    if (await phaseSealed('selection')) throw new Error(`door ${key} is closed: the selection is sealed`);

    const trace = await anyTestTrace();

    if (trace) throw new Error(`door ${key} is closed: ${trace}`);
    return;
  }

  if (key.startsWith('test-')) {
    const fold = key.slice('test-'.length);

    if (!(foldKeys as readonly string[]).includes(fold)) throw new Error(`unknown door ${key}`);

    await requirePhase('selection');
    await requirePhase('audit');

    for (const earlier of testOrder.slice(0, testOrder.indexOf(fold as (typeof testOrder)[number]))) {
      if (!(await phaseSealed(`test-${earlier}`)))
        throw new Error(`door ${key}: the documented order requires test-${earlier} first`);
    }

    return;
  }

  throw new Error(`unknown door ${key}`);
};

export const requireChainIntact = verifyChain;
