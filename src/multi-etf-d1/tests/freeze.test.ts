// The manifest hash covers the whole body: any change to a frozen parameter is detected.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { type Manifest, hashJson, verifyManifestHash } from '../freeze.ts';

describe('freeze manifest', () => {
  test('a tampered manifest no longer verifies', () => {
    const body = {
      version: 'test',
      frozenAt: '2026-10-23T00:00:00Z',
      gitHead: 'abc',
      gitModifiedTrackedFiles: [],
      protocolHash: 'p',
      engineVersion: 'e',
      dataHashes: { XBI: 'h' },
      codeHashes: { 'a.ts': 'c' },
      settings: {},
      tickers: { XBI: { nominations: [{ params: { targetPercentChange: 216 } }] } }
    } as unknown as Omit<Manifest, 'manifestHash'>;
    const manifest = { ...body, manifestHash: hashJson(body) } as Manifest;

    assert.ok(verifyManifestHash(manifest));

    const tampered = JSON.parse(JSON.stringify(manifest)) as Manifest;

    (
      tampered.tickers.XBI as unknown as { nominations: { params: { targetPercentChange: number } }[] }
    ).nominations[0]!.params.targetPercentChange = 217;
    assert.ok(!verifyManifestHash(tampered));

    const relabelled = { ...manifest, frozenAt: '2026-10-24T00:00:00Z' };

    assert.ok(!verifyManifestHash(relabelled));
  });
});
