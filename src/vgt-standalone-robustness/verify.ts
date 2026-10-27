// `npm run vgt-robustness -- verify`: the read-only inputs are unchanged, the completed B4/B5 audit and the
// prospective B4/B5 freeze are intact, this study's protocol is at its recorded amendment head, and every stored record
// file equals MANIFEST.json. It writes nothing and exits 1 on any failure.
import fs from 'fs-extra';
import { verifyProspectiveFreeze } from '../pools/forward/freeze.ts';
import {
  priorProtocolSha256,
  protocolFile,
  protocolFreezeFile,
  protocolOriginalSha256,
  protocolSha256,
  readJson,
  researchRoot,
  sha256Of
} from './context.ts';

// The read-only inputs, hashed at the start of the study (RESEARCH_RECOVERY.md, 2026-10-27T12:49Z).
export const readOnlyInputs: Record<string, string> = {
  'config/pools/B4.json': '4ca5aa1a900bc9596007c914a333ff13b0a0e14df32e3d8ba5b7ce16638edf40',
  'config/pools/B5.json': 'deef53ca531118064925a64e25288c927f3a71d8a05311075b439087960020fe',
  'config/phenotypes/D1/VGT.json': '3e77a419943b6a066c5467494947dfd4e1212a436ea79f6777c99764ca6c5f70',
  'config/phenotypes/D1/XBI.json': '453c4fd00d9de91269da718011c78b3d20d4611a0791005285345cbdac12aff8',
  'config/phenotypes/D1/XRT.json': 'd7b7f222bb8921ec5a3781d3b98c32f3045eb775cb5e01ee5e6af05af4e7cee9',
  'config/phenotypes/D1/KRE.json': '6b8889e20ab3c07e85f12e5c344166588495e95bc1f5573b36699e8a587a8c8d',
  'config/phenotypes/D1/GDX.json': 'ed98c23c7c1e741401862bdf481175a106367d30ddea7ba1b5906859cb0ce71b',
  'research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json':
    '0dabd97e2b3d50fe9946b773bd9b845b07da1934eb4a797ecc9a59af129c3be2',
  'research/joint-16-etf-d1/results/controls/controls.json':
    '2bd521dcd95a1a2ed39234f62eab131da20e2e0afe587ca339149a6e69af5e5e',
  'research/b4-b5-robustness-audit/PROTOCOL.md': priorProtocolSha256,
  'research/b4-b5-robustness-audit/PROTOCOL_FREEZE.json':
    '13fbc2ec69e03807d79ded68c83a0b7023d6e1d1bef7ae98236b4d8da89d1b87',
  'research/b4-b5-robustness-audit/MANIFEST.json': '794a6ffdfc43c274990a669f35a7d161322e89ac62e3e65a321b1c92679bd4d2',
  'research/b4-b5-robustness-audit/PROSPECTIVE_CRITERIA_FREEZE.json':
    'f938dda3beb19f42d1e6612f4e3790427fa69336ec230719428b007fcaadb0e3',
  'research/b4-b5-robustness-audit/results/analysis.json':
    '331bc9a6d1a62c3b9de73a38a792026243952a58b1d53ef6a9549ab8f24bbb90',
  'research/b4-b5-robustness-audit/results/baseline/baseline.json':
    '1fc93b66c71af3ba7fa95b29ee88eaf671cd24f81be66b887f8afc3e9a4e5e7d',
  'research/b4-b5-robustness-audit/results/runs/ablation.jsonl':
    'bb1fed3a3cb2ee6ccdc91215de635e24b802f245da65ce9ff7084021900197de',
  'research/b4-b5-robustness-audit/results/runs/base.jsonl':
    '6b0997aa30729aa0e2ef1ebd6b9be7f858b357f74fb1056c6e0363a142cfa5dd',
  'research/b4-b5-robustness-audit/results/runs/book.jsonl':
    '07ef28b11b2381423133e9e883d88bd1e6480c2b75a2214202d139622ca4065b',
  'research/b4-b5-robustness-audit/results/runs/boundary.jsonl':
    '192328a0b7593a9cb0acb97eae6ca53241618408ebaabf0109fae1855da92f3f',
  'research/b4-b5-robustness-audit/results/runs/control.jsonl':
    'a0147a528b8ec0a5d693186be50444beecda3f50ad0fd84f4dd824768f1a51b8',
  'research/b4-b5-robustness-audit/results/runs/cost.jsonl':
    '6a9c6e186254e755463199acf6480e6910a3cb91c397c36dcb99129211ac0ba9',
  'research/b4-b5-robustness-audit/results/runs/dividends.jsonl':
    'd4f01048a49b978e29c289c74b687da32a0c6e41a63a6b0bb15adb1a5c4bde84',
  'research/b4-b5-robustness-audit/results/runs/joint.jsonl':
    'ee158a7f7cdefea543590ab696c23c83c5e9a776fcde7de9e6c103dc29f53e49',
  'research/b4-b5-robustness-audit/results/runs/oat.jsonl':
    '8be209e6e1dd2a0b1af2084158c8271433679af3a5674914f39368a354bf67e4',
  'data/partitions.json': '43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6',
  'config/market-events/splits.json': 'e5bde427182fea627e38aba69c14ae16cf8b7e428e75bf4153e55db1d1cb5ba2',
  'config/market-events/distributions.csv': '3b4342eb7cdbb270d78a355576c2098d7692caae3ae0550bcbeb64d7a7528259',
  'package-lock.json': 'ee4c73e35bde161ce16218902ddc9aa079a78330bdd5e512689ebe593129cc46',
  'data/VOOG/data.csv': 'a7aa42aeebd9e83f94368f0ee7761410ffacf734524f3cc7655af32354de51ab',
  'data/VGT/data.csv': 'd8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09',
  'data/XBI/data.csv': '9afecc0606330d68ca12f7b0c331f75a150f64d0dad2e6ff910538a667b0c031',
  'data/XRT/data.csv': 'ca0fdc6a4c77a97d047bb710bcefc24fe7fdbd0dc117794725008b33700a0752',
  'data/KRE/data.csv': '40e7bd6c72c1dffb343b265bed16d69c964ba5bee81ad297a15e6d8a5607e01a',
  'data/GDX/data.csv': '86ce101fede1a412dd452fcc29dc87b69ade4ad67629230172fde878b7c2c320'
};

export const verify = async () => {
  const failures: string[] = [];
  const check = (name: string, pass: boolean, detail: string) => {
    console.log(`[verify] ${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);

    if (!pass) {
      failures.push(name);
    }
  };

  for (const [file, expected] of Object.entries(readOnlyInputs)) {
    const exists = await fs.pathExists(file);
    const actual = exists ? await sha256Of(file) : 'missing';

    check(`read-only ${file}`, actual === expected, actual === expected ? 'unchanged' : `${actual} ≠ ${expected}`);
  }

  const protocol = await sha256Of(protocolFile);
  const freeze = await readJson<{ protocolSha256: string; amendments?: { id: string; protocolSha256: string }[] }>(
    protocolFreezeFile
  );
  const head = freeze.amendments?.at(-1)?.protocolSha256 ?? freeze.protocolSha256;

  check('PROTOCOL_FREEZE.json original hash', freeze.protocolSha256 === protocolOriginalSha256, freeze.protocolSha256);
  check(
    'PROTOCOL.md = the recorded amendment head',
    protocol === head && head === protocolSha256,
    `${protocol.slice(0, 16)}…`
  );

  const prospective = await verifyProspectiveFreeze();

  check(
    'prospective B4/B5 freeze (research/prospective-b4-b5-shadow) verifies',
    prospective.frozen && prospective.failures.length === 0,
    prospective.failures.length ? prospective.failures.join('; ') : 'verifies'
  );

  const manifestFile = `${researchRoot}/MANIFEST.json`;

  if (await fs.pathExists(manifestFile)) {
    const manifest = await readJson<{ records: Record<string, string> }>(manifestFile);

    for (const [file, expected] of Object.entries(manifest.records)) {
      const actual = (await fs.pathExists(file)) ? await sha256Of(file) : 'missing';

      check(
        `record ${file}`,
        actual === expected,
        actual === expected ? 'equals MANIFEST.json' : `${actual} ≠ ${expected}`
      );
    }
  } else {
    check('MANIFEST.json', false, 'missing (run `manifest`)');
  }

  console.log(`[verify] ${failures.length === 0 ? 'all checks passed' : `${failures.length} FAILED`}`);

  if (failures.length > 0) {
    throw new Error(`verification failed: ${failures.join(', ')}`);
  }
};
