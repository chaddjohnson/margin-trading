// The phenotype registry: JSON files under config/phenotypes/<architecture>/<SYMBOL>.json, one per symbol, each
// holding any number of named phenotypes. A file is validated as a whole when it is read (schema version, keys,
// architecture, symbol, every phenotype's full parameter vector), so a typo anywhere fails loudly instead of
// falling back to a strategy default. Metadata (descriptions, provenance) is kept apart from the parameters and
// never reaches a strategy.
import path from 'node:path';
import fs from 'fs-extra';
import {
  type Architecture,
  PhenotypeError,
  type ResolvedParameter,
  architectureOf,
  closestName,
  parseParameter
} from './architectures.ts';

export const phenotypeRoot = 'config/phenotypes';
export const phenotypeSchemaVersion = 1;

export interface Phenotype {
  name: string;
  description?: string;
  // In the architecture's parameter order.
  parameters: ResolvedParameter[];
  provenance?: Record<string, unknown>;
}

export interface PhenotypeFile {
  path: string;
  schemaVersion: number;
  architecture: Architecture;
  symbol: string;
  // The execution profile used unless the command line names another.
  execution: string;
  description?: string;
  phenotypes: Record<string, Phenotype>;
}

const fileKeys = ['schemaVersion', 'architecture', 'symbol', 'execution', 'description', 'phenotypes'];
const phenotypeKeys = ['description', 'parameters', 'provenance'];
const namePattern = /^[A-Za-z][A-Za-z0-9_-]*$/;
export const symbolPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const checkKeys = (object: Record<string, unknown>, allowed: string[], where: string) => {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) {
      const hint = closestName(key, allowed);

      throw new PhenotypeError(
        `${where}: unknown key '${key}'${hint ? ` (did you mean '${hint}'?)` : ''}; allowed keys: ${allowed.join(', ')}`
      );
    }
  }
};

// Validates a parsed phenotype file. `file` only labels the messages.
export const parsePhenotypeFile = (json: unknown, file: string): PhenotypeFile => {
  if (!isObject(json)) {
    throw new PhenotypeError(`${file}: a phenotype file must be a JSON object`);
  }

  checkKeys(json, fileKeys, file);

  if (json.schemaVersion !== phenotypeSchemaVersion) {
    throw new PhenotypeError(
      `${file}: schemaVersion must be ${phenotypeSchemaVersion}, not ${JSON.stringify(json.schemaVersion)}`
    );
  }

  if (typeof json.architecture !== 'string') {
    throw new PhenotypeError(`${file}: architecture must be a string such as "D1"`);
  }

  const architecture = architectureOf(json.architecture);

  if (typeof json.symbol !== 'string' || !symbolPattern.test(json.symbol)) {
    throw new PhenotypeError(`${file}: symbol must be a ticker such as "VGT", not ${JSON.stringify(json.symbol)}`);
  }

  if (typeof json.execution !== 'string' || !namePattern.test(json.execution)) {
    throw new PhenotypeError(`${file}: execution must name an execution profile under config/execution/`);
  }

  if (json.description !== undefined && typeof json.description !== 'string') {
    throw new PhenotypeError(`${file}: description must be a string`);
  }

  if (!isObject(json.phenotypes) || Object.keys(json.phenotypes).length === 0) {
    throw new PhenotypeError(`${file}: phenotypes must be an object with at least one named phenotype`);
  }

  const parameterNames = architecture.parameters.map((spec) => spec.name);
  const phenotypes: Record<string, Phenotype> = {};

  for (const [name, definition] of Object.entries(json.phenotypes)) {
    const where = `${file}: phenotype '${name}'`;

    if (!namePattern.test(name)) {
      throw new PhenotypeError(`${where}: names start with a letter and use letters, digits, '-' and '_'`);
    }

    if (!isObject(definition)) {
      throw new PhenotypeError(`${where} must be an object`);
    }

    checkKeys(definition, phenotypeKeys, where);

    if (definition.description !== undefined && typeof definition.description !== 'string') {
      throw new PhenotypeError(`${where}: description must be a string`);
    }

    if (definition.provenance !== undefined && !isObject(definition.provenance)) {
      throw new PhenotypeError(`${where}: provenance must be an object`);
    }

    if (!isObject(definition.parameters)) {
      throw new PhenotypeError(`${where}: parameters must be an object`);
    }

    const parameters = definition.parameters;

    for (const key of Object.keys(parameters)) {
      if (!parameterNames.includes(key)) {
        const hint = closestName(key, parameterNames);

        throw new PhenotypeError(
          `${where}: '${key}' is not a ${architecture.name} parameter${hint ? ` (did you mean '${hint}'?)` : ''}; ${architecture.name} parameters: ${parameterNames.join(', ')}`
        );
      }
    }

    const missing = parameterNames.filter((key) => !(key in parameters));

    if (missing.length > 0) {
      throw new PhenotypeError(
        `${where}: missing ${architecture.name} parameter${missing.length > 1 ? 's' : ''} ${missing.join(', ')} (a phenotype must set every parameter of its architecture; nothing falls back to a strategy default)`
      );
    }

    phenotypes[name] = {
      name,
      description: definition.description as string | undefined,
      parameters: architecture.parameters.map((spec) => parseParameter(spec, parameters[spec.name], where)),
      provenance: definition.provenance as Record<string, unknown> | undefined
    };
  }

  return {
    path: file,
    schemaVersion: json.schemaVersion,
    architecture,
    symbol: json.symbol,
    execution: json.execution,
    description: json.description as string | undefined,
    phenotypes
  };
};

export const readPhenotypeFile = async (file: string): Promise<PhenotypeFile> => {
  if (!(await fs.pathExists(file))) {
    throw new PhenotypeError(`Phenotype file ${file} does not exist`);
  }

  let json: unknown;

  try {
    json = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    throw new PhenotypeError(`${file} is not valid JSON: ${(error as Error).message}`);
  }

  return parsePhenotypeFile(json, file);
};

// The file of an architecture's symbol, matched case-sensitively even on a case-insensitive file system.
export const phenotypeFileOf = async (architecture: string, symbol: string, root = phenotypeRoot) => {
  const directory = path.join(root, architecture);

  if (!symbolPattern.test(symbol)) {
    throw new PhenotypeError(`'${symbol}' is not a valid symbol`);
  }

  if (!(await fs.pathExists(directory))) {
    throw new PhenotypeError(`No phenotype directory ${directory} for architecture ${architecture}`);
  }

  const files = (await fs.readdir(directory)).filter((name) => name.endsWith('.json'));
  const wanted = `${symbol}.json`;

  if (!files.includes(wanted)) {
    const nearMatch = files.find((name) => name.toLowerCase() === wanted.toLowerCase());
    const available = files.map((name) => name.replace(/\.json$/, '')).join(', ') || 'none';

    throw new PhenotypeError(
      nearMatch
        ? `No phenotype file ${path.join(directory, wanted)}; symbols are case-sensitive and ${path.join(directory, nearMatch)} exists`
        : `No ${architecture} phenotypes for ${symbol}: ${path.join(directory, wanted)} does not exist (symbols with ${architecture} phenotypes: ${available})`
    );
  }

  return path.join(directory, wanted);
};

export interface PhenotypeSelection {
  file: PhenotypeFile;
  phenotype: Phenotype;
}

// One named phenotype of a symbol, from its registry file or from an explicit file. The file must be the
// architecture's and the symbol's, so a phenotype is never applied to another symbol or strategy family.
export const selectPhenotype = async ({
  architecture,
  symbol,
  name,
  file: explicitFile,
  root = phenotypeRoot
}: {
  architecture: string;
  symbol: string;
  name: string;
  file?: string;
  root?: string;
}): Promise<PhenotypeSelection> => {
  const file = await readPhenotypeFile(explicitFile ?? (await phenotypeFileOf(architecture, symbol, root)));

  if (file.architecture.name !== architecture) {
    throw new PhenotypeError(
      `${file.path} holds ${file.architecture.name} phenotypes, but the strategy takes ${architecture} phenotypes`
    );
  }

  if (file.symbol !== symbol) {
    throw new PhenotypeError(
      `${file.path} holds phenotypes for ${file.symbol}, not ${symbol} (symbols are case-sensitive)`
    );
  }

  const expectedName = `${file.symbol}.json`;

  if (!explicitFile && path.basename(file.path) !== expectedName) {
    throw new PhenotypeError(`${file.path} should be named ${expectedName} after its symbol`);
  }

  const phenotype = file.phenotypes[name];

  if (!phenotype) {
    const names = Object.keys(file.phenotypes);
    const hint = closestName(name, names);

    throw new PhenotypeError(
      `No phenotype '${name}' for ${symbol} in ${file.path}${hint ? ` (did you mean '${hint}'?)` : ''}; available: ${names.join(', ')}`
    );
  }

  return { file, phenotype };
};

// Every phenotype file of every architecture directory, validated.
export const listPhenotypeFiles = async (root = phenotypeRoot): Promise<PhenotypeFile[]> => {
  if (!(await fs.pathExists(root))) {
    return [];
  }

  const files: PhenotypeFile[] = [];

  for (const directory of (await fs.readdir(root)).sort()) {
    const full = path.join(root, directory);

    if (!(await fs.stat(full)).isDirectory()) {
      continue;
    }

    for (const name of (await fs.readdir(full)).filter((entry) => entry.endsWith('.json')).sort()) {
      const file = await readPhenotypeFile(path.join(full, name));

      if (file.architecture.name !== directory) {
        throw new PhenotypeError(`${file.path} declares architecture ${file.architecture.name} but is under ${full}`);
      }

      if (`${file.symbol}.json` !== name) {
        throw new PhenotypeError(`${file.path} declares symbol ${file.symbol} and should be named ${file.symbol}.json`);
      }

      files.push(file);
    }
  }

  return files;
};
