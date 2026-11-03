// Dataset sources. The UI only ever sees `DatasetSource`; today the one implementation fetches the checked-in demo
// fixture. A later adapter (e.g. one that reads a research study's price file and entry-event records read-only)
// implements the same interface and returns the same schema — nothing else in the app changes.

import { validateDataset } from '../schema/validate.ts';
import { type ExplorerModel, buildModel } from './model.ts';

export interface DatasetSource {
  id: string;
  label: string;
  /** Resolves to the raw, not yet validated JSON value. */
  fetchRaw(signal?: AbortSignal): Promise<unknown>;
}

export class StaticJsonSource implements DatasetSource {
  readonly id: string;
  readonly label: string;
  readonly url: string;

  constructor(id: string, label: string, url: string) {
    this.id = id;
    this.label = label;
    this.url = url;
  }

  async fetchRaw(signal?: AbortSignal): Promise<unknown> {
    const res = await fetch(this.url, { signal });
    if (!res.ok) throw new Error(`could not load ${this.url}: HTTP ${res.status}`);
    return res.json();
  }
}

export const demoSource = new StaticJsonSource(
  'demo-synthetic',
  'Demo — synthetic data',
  `${import.meta.env.BASE_URL}data/demo-dataset.v1.json`
);

export type LoadResult = { ok: true; model: ExplorerModel } | { ok: false; errors: string[] };

/** Fetches, validates and indexes a dataset. Invalid data is rejected with its validation errors. */
export async function loadDataset(source: DatasetSource, signal?: AbortSignal): Promise<LoadResult> {
  let raw: unknown;
  try {
    raw = await source.fetchRaw(signal);
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
  const result = validateDataset(raw);
  if (!result.ok) return result;
  return { ok: true, model: buildModel(result.dataset, 'exact') };
}
