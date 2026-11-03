// Runtime validation of a dataset (schema version 1). A dataset that fails is never displayed: the UI shows the
// errors instead. Checks structure and types, units, timestamp/time-zone consistency, ordering, uniqueness and the
// signal ↔ executed links. Alignment of events to bars is a separate, explicit step (align.ts).

import { isIsoUtc, isSessionDate, sessionDateOf } from './time.ts';
import { DATASET_SCHEMA_ID, DATASET_SCHEMA_VERSION, type Dataset, type EntryEvent } from './types.ts';

export type ValidationResult = { ok: true; dataset: Dataset } | { ok: false; errors: string[] };

const MAX_ERRORS = 50;
const ID = /^[a-z0-9][a-z0-9.-]*$/;
const EVENT_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;
const UNITS = new Set(['percent', 'sessions', 'price', 'ratio', 'index', 'count', 'date', 'text']);

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPos = (v: unknown): v is number => isNum(v) && v > 0;

class Collector {
  errors: string[] = [];
  add(msg: string) {
    if (this.errors.length < MAX_ERRORS) this.errors.push(msg);
  }
  get full() {
    return this.errors.length >= MAX_ERRORS;
  }
}

function checkParameters(list: unknown, where: string, c: Collector) {
  if (!Array.isArray(list)) return c.add(`${where}: must be an array of parameter values`);
  list.forEach((p, i) => {
    const at = `${where}[${i}]`;
    if (!isObj(p)) return c.add(`${at}: must be an object`);
    if (!isStr(p.key)) c.add(`${at}.key: required string`);
    if (!isStr(p.label)) c.add(`${at}.label: required string`);
    if (!UNITS.has(p.unit as string)) c.add(`${at}.unit: must be one of ${[...UNITS].join(', ')}`);
    if (!(isNum(p.value) || typeof p.value === 'string')) c.add(`${at}.value: must be a finite number or a string`);
    if (p.unit === 'date' && !isSessionDate(p.value)) c.add(`${at}.value: a date value must be YYYY-MM-DD`);
    if ((p.unit === 'percent' || p.unit === 'price' || p.unit === 'sessions' || p.unit === 'count') && !isNum(p.value))
      c.add(`${at}.value: a ${String(p.unit)} value must be a number`);
  });
}

export function validateDataset(input: unknown): ValidationResult {
  const c = new Collector();
  if (!isObj(input)) return { ok: false, errors: ['dataset: must be a JSON object'] };

  if (input.schema !== DATASET_SCHEMA_ID) c.add(`schema: expected "${DATASET_SCHEMA_ID}"`);
  if (input.schemaVersion !== DATASET_SCHEMA_VERSION)
    c.add(`schemaVersion: expected ${DATASET_SCHEMA_VERSION}, got ${JSON.stringify(input.schemaVersion)}`);
  if (!isStr(input.datasetId) || !ID.test(input.datasetId)) c.add('datasetId: required, lowercase id');
  if (!isStr(input.title)) c.add('title: required string');

  const prov = input.provenance;
  if (!isObj(prov)) c.add('provenance: required object');
  else {
    if (!['synthetic', 'backtest', 'research-study'].includes(prov.kind as string))
      c.add('provenance.kind: must be synthetic, backtest or research-study');
    if (!isStr(prov.description)) c.add('provenance.description: required string');
    if (!Array.isArray(prov.disclosures) || !prov.disclosures.every(isStr))
      c.add('provenance.disclosures: required array of strings');
    if (prov.kind === 'synthetic') {
      const g = prov.generator;
      if (!isObj(g) || !isStr(g.name) || !isStr(g.version) || !isNum(g.seed))
        c.add('provenance.generator: a synthetic dataset needs {name, version, seed}');
    }
  }

  const inst = input.instrument;
  let tz = 'America/New_York';
  let synthetic = false;
  if (!isObj(inst)) c.add('instrument: required object');
  else {
    if (!isStr(inst.symbol)) c.add('instrument.symbol: required string');
    if (!isStr(inst.label)) c.add('instrument.label: required string');
    if (typeof inst.isSynthetic !== 'boolean') c.add('instrument.isSynthetic: required boolean');
    synthetic = inst.isSynthetic === true;
    if (!isStr(inst.currency) || !/^[A-Z]{3}$/.test(inst.currency)) c.add('instrument.currency: ISO 4217 code');
    if (!['none', 'splits', 'splits-and-distributions'].includes(inst.priceAdjustment as string))
      c.add('instrument.priceAdjustment: must be none, splits or splits-and-distributions');
    if (!isStr(inst.exchangeTimezone)) c.add('instrument.exchangeTimezone: required IANA time zone');
    else {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: inst.exchangeTimezone });
        tz = inst.exchangeTimezone;
      } catch {
        c.add(`instrument.exchangeTimezone: unknown time zone "${inst.exchangeTimezone}"`);
      }
    }
    if (synthetic && !/synthetic/i.test(String(inst.label)))
      c.add('instrument.label: a synthetic instrument must say "synthetic" in its label');
  }
  if (isObj(prov) && (prov.kind === 'synthetic') !== synthetic)
    c.add('instrument.isSynthetic must be true exactly when provenance.kind is "synthetic"');

  const series = input.priceSeries;
  const barTimes = new Set<number>();
  if (!isObj(series)) c.add('priceSeries: required object');
  else {
    if (series.interval !== '1d' && series.interval !== '1m') c.add('priceSeries.interval: must be 1d or 1m');
    if (series.timestampConvention !== 'bar-close' && series.timestampConvention !== 'bar-open')
      c.add('priceSeries.timestampConvention: must be bar-close or bar-open');
    if (!isStr(series.calendar)) c.add('priceSeries.calendar: required string');
    if (!Array.isArray(series.bars) || series.bars.length < 2) c.add('priceSeries.bars: at least two bars required');
    else {
      let prev = -Infinity;
      for (let i = 0; i < series.bars.length && !c.full; i++) {
        const b = series.bars[i] as unknown;
        const at = `priceSeries.bars[${i}]`;
        if (!isObj(b)) {
          c.add(`${at}: must be an object`);
          continue;
        }
        if (!isIsoUtc(b.t)) {
          c.add(`${at}.t: must be an ISO 8601 UTC instant ending in Z`);
          continue;
        }
        const ms = Date.parse(b.t);
        if (ms === prev) c.add(`${at}.t: duplicate timestamp ${b.t}`);
        else if (ms < prev) c.add(`${at}.t: bars must be strictly ascending (${b.t})`);
        prev = Math.max(prev, ms);
        barTimes.add(ms);
        if (!isSessionDate(b.d)) c.add(`${at}.d: must be YYYY-MM-DD`);
        else if (sessionDateOf(ms, tz) !== b.d) c.add(`${at}.d: ${b.d} is not the ${tz} date of ${b.t}`);
        if (!isPos(b.o) || !isPos(b.h) || !isPos(b.l) || !isPos(b.c)) c.add(`${at}: o, h, l, c must be positive`);
        else if (b.h < Math.max(b.o, b.c) || b.l > Math.min(b.o, b.c) || b.l > b.h)
          c.add(`${at}: inconsistent OHLC (needs l ≤ min(o, c) and h ≥ max(o, c))`);
        if (b.v !== undefined && !(isNum(b.v) && b.v >= 0)) c.add(`${at}.v: must be a non-negative number`);
      }
    }
  }

  const exec = input.executionModel;
  if (exec !== undefined) {
    if (!isObj(exec)) c.add('executionModel: must be an object');
    else {
      if (!isStr(exec.id) || !isStr(exec.label) || !isStr(exec.description))
        c.add('executionModel: id, label and description are required');
      if (typeof exec.isIllustrative !== 'boolean') c.add('executionModel.isIllustrative: required boolean');
      checkParameters(exec.parameters, 'executionModel.parameters', c);
    }
  }

  const variations = input.variations;
  const eventsById = new Map<string, EntryEvent>();
  let anyExecuted = false;
  if (!Array.isArray(variations) || variations.length === 0) c.add('variations: at least one variation required');
  else {
    const ids = new Set<string>();
    variations.forEach((v, vi) => {
      const at = `variations[${vi}]`;
      if (!isObj(v)) return c.add(`${at}: must be an object`);
      if (!isStr(v.id) || !ID.test(v.id)) c.add(`${at}.id: required, lowercase id`);
      else if (ids.has(v.id)) c.add(`${at}.id: duplicate variation id ${v.id}`);
      else ids.add(v.id);
      for (const k of ['code', 'name', 'family', 'summary']) if (!isStr(v[k])) c.add(`${at}.${k}: required string`);
      checkParameters(v.parameters, `${at}.parameters`, c);
      if (!Array.isArray(v.events)) return c.add(`${at}.events: required array`);
      v.events.forEach((e, ei) => {
        if (c.full) return;
        const eat = `${at}.events[${ei}]`;
        if (!isObj(e)) return c.add(`${eat}: must be an object`);
        if (!isStr(e.id) || !EVENT_ID.test(e.id)) c.add(`${eat}.id: required id`);
        else if (eventsById.has(e.id)) c.add(`${eat}.id: duplicate event id ${e.id}`);
        else eventsById.set(e.id, e as unknown as EntryEvent);
        if (e.variationId !== v.id) c.add(`${eat}.variationId: must equal the containing variation's id (${v.id})`);
        if (e.type !== 'signal' && e.type !== 'executed') c.add(`${eat}.type: must be signal or executed`);
        if (e.type === 'executed') anyExecuted = true;
        if (!isIsoUtc(e.t)) c.add(`${eat}.t: must be an ISO 8601 UTC instant ending in Z`);
        else if (!isSessionDate(e.d)) c.add(`${eat}.d: must be YYYY-MM-DD`);
        else if (sessionDateOf(Date.parse(e.t), tz) !== e.d) c.add(`${eat}.d: ${e.d} is not the ${tz} date of ${e.t}`);
        if (!isPos(e.price)) c.add(`${eat}.price: must be a positive number`);
        if (!['bar-close', 'bar-open', 'fill'].includes(e.priceBasis as string))
          c.add(`${eat}.priceBasis: must be bar-close, bar-open or fill`);
        const trig = e.trigger;
        if (!isObj(trig) || !isStr(trig.summary)) c.add(`${eat}.trigger.summary: required string`);
        else checkParameters(trig.values, `${eat}.trigger.values`, c);
        if (e.linkedEventId !== undefined && !isStr(e.linkedEventId)) c.add(`${eat}.linkedEventId: must be a string`);
        if (e.type === 'executed' && !isStr(e.linkedEventId))
          c.add(`${eat}.linkedEventId: an executed entry must link to the signal it executed`);
        if (e.execution !== undefined) {
          const x = e.execution;
          if (e.type !== 'signal') c.add(`${eat}.execution: only signals carry an execution status`);
          if (!isObj(x) || (x.status !== 'executed' && x.status !== 'not-executed'))
            c.add(`${eat}.execution.status: must be executed or not-executed`);
        }
        if (e.meta !== undefined) {
          if (!isObj(e.meta)) c.add(`${eat}.meta: must be an object`);
          else
            for (const [k, mv] of Object.entries(e.meta))
              if (!(mv === null || ['string', 'number', 'boolean'].includes(typeof mv)))
                c.add(`${eat}.meta.${k}: values must be string, number, boolean or null`);
        }
      });
    });
  }
  if (anyExecuted && exec === undefined) c.add('executionModel: required when any event is of type executed');

  // Links must resolve and agree in both directions: executed ↔ signal, same variation.
  for (const e of eventsById.values()) {
    if (c.full) break;
    if (e.linkedEventId === undefined) {
      if (e.type === 'signal' && e.execution?.status === 'executed')
        c.add(`event ${e.id}: an executed signal must link to its executed entry`);
      continue;
    }
    const other = eventsById.get(e.linkedEventId);
    if (!other) c.add(`event ${e.id}: linkedEventId ${e.linkedEventId} does not exist`);
    else if (other.type === e.type) c.add(`event ${e.id}: must link a signal to an executed entry`);
    else if (other.variationId !== e.variationId) c.add(`event ${e.id}: linked event is in another variation`);
    else if (other.linkedEventId !== e.id) c.add(`event ${e.id}: link to ${other.id} is not reciprocal`);
    else if (e.type === 'signal' && e.execution?.status !== 'executed')
      c.add(`event ${e.id}: a signal linked to an executed entry must have execution.status "executed"`);
    else if (e.type === 'executed' && Date.parse(e.t) < Date.parse(other.t))
      c.add(`event ${e.id}: executed before its signal ${other.id}`);
  }

  if (c.errors.length > 0) return { ok: false, errors: c.errors };
  return { ok: true, dataset: input as unknown as Dataset };
}
