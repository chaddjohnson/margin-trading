// The VGT/VOOG distribution ledger: the issuer response parser, every validation rule (zero-event spans are fine,
// missing quarters, duplicates, pay before ex, non-positive amounts, split-unit mistakes, coverage), the hash check of
// the verified ledger, and the shipped ledger rebuilt byte for byte from its stored issuer snapshot.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { buildLedger } from '../cli.ts';
import {
  type LedgerRow,
  frozenCoverageEnd,
  issuerEvents,
  ledgerFile,
  manifestFile,
  parseLedger,
  readVerifiedLedger,
  validateLedger
} from '../ledger.ts';

const row = (
  etf: 'VGT' | 'VOOG',
  exDate: string,
  amount = '0.5',
  payDate = exDate,
  closeBefore = '100'
): LedgerRow => ({
  etf,
  exDate,
  payDate,
  amount,
  amountMethod: 'issuer',
  exDateMethod: 'issuer',
  payDateMethod: 'issuer',
  closeBefore,
  source: 'test'
});

const quarterly = (etf: 'VGT' | 'VOOG') => [
  row(etf, '2025-06-26', '0.5', '2025-06-30'),
  row(etf, '2025-09-24', '0.5', '2025-09-26'),
  row(etf, '2025-12-17', '0.5', '2025-12-19')
];
const coverage = { VGT: '2026-02-15', VOOG: '2026-02-15' };
const problems = (rows: LedgerRow[], through = coverage) => validateLedger(rows, through).map((issue) => issue.problem);

describe('the distribution ledger', () => {
  test('quarterly distributions with no events between them are valid', () => {
    assert.deepEqual(problems([...quarterly('VGT'), ...quarterly('VOOG')]), []);
  });

  test('a missing quarter, a stale ledger, duplicates and bad rows are refused', () => {
    const vgt = quarterly('VGT');

    assert.match(
      problems([vgt[0]!, vgt[2]!, ...quarterly('VOOG')]).join(),
      /174 days after the previous distribution: a quarter is missing/
    );
    assert.match(
      problems([...vgt, ...quarterly('VOOG')], { VGT: '2026-06-30', VOOG: '2026-02-15' }).join(),
      /195 days before the coverage date/
    );
    assert.match(problems([...vgt, vgt[2]!, ...quarterly('VOOG')]).join(), /not after the previous ex-date/);
    assert.match(
      problems([row('VGT', '2025-06-26', '0'), ...vgt.slice(1), ...quarterly('VOOG')]).join(),
      /not positive/
    );
    assert.match(
      problems([row('VGT', '2025-06-26', '0.5', '2025-06-25'), ...vgt.slice(1), ...quarterly('VOOG')]).join(),
      /before its ex-date/
    );
    assert.match(
      problems([row('VGT', '2025-06-28'), ...vgt.slice(1), ...quarterly('VOOG')]).join(),
      /not an NYSE session/
    );
    // A post-split amount against a pre-split close (or the reverse) gives an implausible yield.
    assert.match(
      problems([row('VGT', '2025-06-26', '0.5', '2025-06-30', '3000'), ...vgt.slice(1), ...quarterly('VOOG')]).join(),
      /implausible/
    );
    assert.match(problems(quarterly('VGT')).join(), /no distributions/);
  });

  test('the issuer response: amounts and dates as published, percentages and empty lists refused', () => {
    const json = {
      divCapGain: {
        item: [
          {
            type: 'Dividend',
            perShareAmount: '$0.146500',
            isPerShareAmtPct: false,
            recordDate: '2026-09-23T00:00:00-04:00',
            payableDate: '2026-09-25T00:00:00-04:00'
          }
        ]
      }
    };

    assert.deepEqual(issuerEvents('VGT', json), [
      { etf: 'VGT', type: 'Dividend', recordDate: '2026-09-23', payableDate: '2026-09-25', amount: '0.146500' }
    ]);
    assert.throws(() => issuerEvents('VGT', { divCapGain: { item: [] } }), /no divCapGain.item/);
    assert.throws(
      () => issuerEvents('VGT', { divCapGain: { item: [{ ...json.divCapGain.item[0], isPerShareAmtPct: true }] } }),
      /not a dollar amount/
    );
  });

  test('the shipped ledger: verified by its manifest, frozen rows first, issuer rows after the frozen coverage', async () => {
    const { rows, manifest } = await readVerifiedLedger();

    assert.equal(manifest.frozenLedger.sha256, '30adf087e7f54927928c12a9d23e198d19336a7e6257df2e9be7e3fc70dba923');
    assert.ok(
      rows
        .filter((candidate) => candidate.exDate <= frozenCoverageEnd)
        .every((candidate) => candidate.amountMethod !== 'issuer')
    );
    assert.ok(
      rows
        .filter((candidate) => candidate.exDate > frozenCoverageEnd)
        .every((candidate) => candidate.amountMethod === 'issuer')
    );
    assert.deepEqual(manifest.coverage.VGT.through >= '2026-10-13', true);
    assert.ok(manifest.crossChecks.every((check) => Math.abs(check.relativeDifference) < 0.005));

    const tampered = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'ledger-')), 'distributions.csv');

    await fs.writeFile(tampered, (await fs.readFile(ledgerFile, 'utf8')).replace('0.146500', '0.146501'));
    await assert.rejects(readVerifiedLedger(tampered, manifestFile), /not its manifest's/);
    assert.equal(parseLedger(await fs.readFile(tampered, 'utf8')).length, rows.length);
  });

  test(
    'the shipped ledger is rebuilt byte for byte from its stored issuer snapshot',
    { skip: fs.existsSync('data/VGT/data.csv') ? false : 'the canonical VGT/VOOG files are not present' },
    async () => {
      const { manifest, text } = await readVerifiedLedger();
      const rebuilt = await buildLedger(path.dirname(manifest.sources[0]!.file));

      assert.equal(rebuilt.text, text);
    }
  );
});
