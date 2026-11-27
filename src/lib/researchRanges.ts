// The authoritative default date ranges of formal research: config/research/date-ranges.json
// (docs/research/OPTIMIZATION_STANDARD.md §1, from 4.0.0).
//
// - development: every optimization, search, refinement, qualification and selection choice;
// - validation: evaluations of frozen selections only.
//
// Both are explicit, inclusive New York session dates, independent of the canonical files' coverage, so appending
// market data never moves them. A change is a new entry with the user's authorization, made `current`; existing entries
// are never edited (a test pins R1). A study pins the entry it adopted and keeps it; research-specific protocols may fix
// narrower windows of their own (earlier folds, earlier cutoffs) inside it. Manual backtests are not bound by it.
//
// The loaders enforce it at data access (src/lib/evaluation.ts access 'development' / 'validation': the window may not
// end after the stage's authorized end, and only the bytes through that end are read), and the research preflight
// checks every adoption manifest against it (src/research-standard/preflight.ts).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { nyseCalendarCoverage } from './calendar.ts';
import { isNewYorkDate, partitionsTimezone } from './partitions.ts';

export const researchRangesFile = path.join(import.meta.dirname, '..', '..', 'config', 'research', 'date-ranges.json');

export type ResearchStage = 'development' | 'validation';
export const researchStages: readonly ResearchStage[] = ['development', 'validation'];

export interface DateWindow {
  from: string; // inclusive New York date
  to: string; // inclusive New York date
}

export interface ResearchRange {
  id: string;
  effective: string;
  recorded?: string;
  development: DateWindow;
  validation: DateWindow;
  sessions?: Record<string, string>;
  authorization: string;
  notes?: string;
}

export interface ResearchRanges {
  kind: 'research-date-ranges';
  schema: 1;
  timezone: typeof partitionsTimezone;
  description: string;
  current: string;
  ranges: ResearchRange[];
  file: string;
  sha256: string;
}

const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const checkWindow = (where: string, w: unknown): DateWindow => {
  const x = w as DateWindow;

  if (!x || !isNewYorkDate(x.from) || !isNewYorkDate(x.to))
    throw new Error(`${where} needs YYYY-MM-DD from and to dates`);
  if (x.from > x.to) throw new Error(`${where}: from ${x.from} is after to ${x.to}`);
  return { from: x.from, to: x.to };
};

export const parseResearchRanges = (body: string, source = 'date-ranges.json'): ResearchRanges => {
  let json: Partial<ResearchRanges>;

  try {
    json = JSON.parse(body) as Partial<ResearchRanges>;
  } catch (error) {
    throw new Error(`${source} is not valid JSON: ${(error as Error).message}`);
  }

  if (json.kind !== 'research-date-ranges' || json.schema !== 1)
    throw new Error(`${source}: kind research-date-ranges, schema 1 expected`);
  if (json.timezone !== partitionsTimezone) throw new Error(`${source}: timezone must be ${partitionsTimezone}`);
  if (!Array.isArray(json.ranges) || json.ranges.length === 0)
    throw new Error(`${source}: ranges must be a non-empty list`);

  const ids = new Set<string>();
  let previous: ResearchRange | undefined;

  for (const r of json.ranges) {
    const where = `${source}: range ${r?.id ?? '(no id)'}`;

    if (!text(r?.id) || ids.has(r.id)) throw new Error(`${where}: every range needs a unique id`);
    ids.add(r.id);
    if (!isNewYorkDate(r.effective)) throw new Error(`${where}: effective must be a YYYY-MM-DD date`);
    if (previous && r.effective < previous.effective)
      throw new Error(`${where}: ranges must be listed in order of effective date`);

    const d = checkWindow(`${where}.development`, r.development);
    const v = checkWindow(`${where}.validation`, r.validation);

    if (!(d.to < v.from))
      throw new Error(`${where}: the development window must end before the validation window starts`);
    if (v.to > nyseCalendarCoverage.last)
      throw new Error(
        `${where}: validation ends ${v.to}, after the NYSE calendar's coverage (${nyseCalendarCoverage.last}, src/lib/calendar.ts)`
      );
    if (!text(r.authorization)) throw new Error(`${where}: authorization (the user's explicit agreement) is required`);
    previous = r;
  }

  if (!text(json.current) || !ids.has(json.current)) throw new Error(`${source}: current must name one of the ranges`);

  return { ...(json as ResearchRanges), file: source, sha256: createHash('sha256').update(body).digest('hex') };
};

const cache = new Map<string, { mtimeMs: number; size: number; ranges: ResearchRanges }>();

export const readResearchRanges = (file = researchRangesFile): ResearchRanges => {
  const { mtimeMs, size } = fs.statSync(file);
  const hit = cache.get(file);

  if (hit && hit.mtimeMs === mtimeMs && hit.size === size) return hit.ranges;

  const ranges = parseResearchRanges(fs.readFileSync(file, 'utf8'), file);

  cache.set(file, { mtimeMs, size, ranges });
  return ranges;
};

// The range in force (`current`), or a named one (a study's pinned entry).
export const researchRange = (id?: string, file = researchRangesFile): ResearchRange => {
  const all = readResearchRanges(file);
  const key = id ?? all.current;
  const r = all.ranges.find((x) => x.id === key);

  if (!r) throw new Error(`no research date range ${key} in ${file}`);
  return r;
};

// The window a formal stage may read: its start and its authorized end. A requested end later than the authorized end
// is refused (before any data are read); an earlier one is allowed (a study's own narrower window or an earlier cutoff).
export const researchWindow = (
  stage: ResearchStage,
  requestedEnd?: string,
  range = researchRange()
): DateWindow & { range: string } => {
  const w = range[stage];

  if (requestedEnd !== undefined) {
    if (!isNewYorkDate(requestedEnd))
      throw new Error(`The ${stage} end must be a YYYY-MM-DD New York date, not '${requestedEnd}'`);
    if (requestedEnd > w.to)
      throw new Error(
        `The ${stage} window ends ${w.to} (research date range ${range.id}, config/research/date-ranges.json); ${requestedEnd} is after it. ` +
          'Newer data are for manual evaluation only; extending a formal window needs a new authorized range.'
      );
    if (requestedEnd < w.from)
      throw new Error(`The ${stage} end ${requestedEnd} is before the ${stage} window starts (${w.from})`);
  }

  return { from: w.from, to: requestedEnd ?? w.to, range: range.id };
};
