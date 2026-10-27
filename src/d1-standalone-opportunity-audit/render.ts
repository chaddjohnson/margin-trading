// Renders the study's Markdown reports: each template in research/d1-standalone-etf-opportunity-audit/templates/
// holds the narrative with {{name}} placeholders, and ./tables.ts computes every placeholder from the stored records.
// A missing placeholder value fails the render, so no report can show a stale or invented number.
import path from 'node:path';
import fs from 'fs-extra';
import { log, researchRoot, templatesRoot, writeText } from './context.ts';
import { placeholdersOf } from './tables.ts';

export const render = async (only?: string[]) => {
  const templates = (await fs.readdir(templatesRoot))
    .filter((name) => name.endsWith('.md'))
    .filter((name) => !only || only.includes(name))
    .sort();
  const values = await placeholdersOf(templates);

  for (const name of templates) {
    const template = await fs.readFile(path.join(templatesRoot, name), 'utf8');
    const missing = new Set<string>();
    const text = template.replace(/\{\{([A-Za-z0-9_.\-:]+)\}\}/g, (_match, key: string) => {
      if (!(key in values)) {
        missing.add(key);
        return `{{${key}}}`;
      }

      return values[key]!;
    });

    if (missing.size > 0) {
      throw new Error(`${name}: no value for ${[...missing].join(', ')}`);
    }

    await writeText(path.join(researchRoot, name), text);
    log(`report ${name}`);
  }
};
