// Fills each report template in templates/ with the generated tables: `{{name}}` becomes
// results/tables.json[name]. Writes the reports next to run.sh.
// Usage: node --experimental-transform-types scripts/assemble-reports.ts <study dir>
import fs from 'fs-extra';

const [, , study = ''] = process.argv;
const tables: Record<string, string> = JSON.parse(await fs.readFile(`${study}/results/tables.json`, 'utf8'));

for (const name of await fs.readdir(`${study}/templates`)) {
  const filled = (await fs.readFile(`${study}/templates/${name}`, 'utf8')).replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => {
      if (!(key in tables)) {
        throw new Error(`${name}: no table ${key}`);
      }

      return tables[key]!;
    }
  );

  await fs.writeFile(`${study}/${name}`, filled);
}

console.info('Assembled the reports');
