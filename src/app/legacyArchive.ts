import { readLegacyArchiveManifest } from '#lib';
import { buildEntry, selectEntries, verifyEntry } from '../legacy-archive/archive.ts';

// Run with `npm run legacy-archive -- build [SYMBOL | legacy path ...]`, `npm run legacy-archive -- verify [...]` or
// `npm run legacy-archive -- list`; see src/legacy-archive/archive.ts and the README.
export default async (command = 'list', ...names: string[]) => {
  const manifest = readLegacyArchiveManifest();

  if (command === 'list') {
    for (const entry of manifest.files) {
      console.info(
        `${entry.legacyPath}  ${entry.rows} rows  sha256 ${entry.sha256.slice(0, 16)}  pinned by ${entry.pinnedBy.length} research files`
      );
    }

    return;
  }

  if (command !== 'build' && command !== 'verify') {
    throw new Error(`Unknown command '${command}'; use build, verify or list`);
  }

  const results = [];

  for (const entry of selectEntries(names)) {
    const result = command === 'build' ? await buildEntry(entry) : await verifyEntry(entry);

    console.info(`${result.status.toUpperCase().padEnd(8)} ${result.legacyPath} → ${result.file}: ${result.detail}`);
    results.push(result);
  }

  const failed = results.filter((result) => result.status === 'failed').length;

  console.info(
    `${results.length - failed} of ${results.length} ${command === 'build' ? 'in place' : 'verified'} (${manifest.root})`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
};
