// The repository root and real-data availability for the pooled-candidate tests (no engine imports: safe for any test).
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const hasData = existsSync(join(REPO, 'data', 'VGT', 'data.csv')) && existsSync(join(REPO, 'data', 'GDX', 'data.csv'));
