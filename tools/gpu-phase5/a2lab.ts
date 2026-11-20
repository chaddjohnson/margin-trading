// gpu-phase5 (copy of tools/gpu-phase3/a2lab.ts, unchanged body): the evaluation Lab of an Assignment 2 replay (NON-OFFICIAL benchmark / identity check). It is
// src/gpu-backend/lab.ts EvalLab — the same archive binding, checkpoints, counts and close — with Assignment 2's own
// archive key and task construction (src/vg-l0-risk-families/space.ts evalKeyOf / quadOf: Growth fixed to New L0's
// phenotype), exactly as Assignment 2's Lab.evalMany (src/vg-l0-risk-families/lab.ts) builds them. evalMany's semantics
// are unchanged: keys, per-key in-flight dedupe, archive reads, input order, the fresh cap.
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { DRec, SRec } from '../../src/vg-l0-risk-families/evaluate.ts';
import { type Cfg, evalKeyOf, quadOf } from '../../src/vg-l0-risk-families/space.ts';
import { EvalLab } from '../../src/gpu-backend/lab.ts';
import type { Task } from '../../src/gpu-backend/client.ts';

export class A2Lab extends EvalLab {
  private readonly a2inflight = new Map<string, Promise<void>>();
  private a2started = false;

  private a2tally(tag: string) {
    return (this.tallies[tag] ??= { fresh: 0, hits: 0, ms: 0 });
  }

  override async evalMany<R extends SRec = SRec>(
    items: readonly { cfg: Cfg; options: EvalOptions; detail?: boolean }[],
    tag = 'other'
  ): Promise<R[]> {
    const keys = items.map((x) => `${evalKeyOf(this.o.door, x.cfg, x.options)}${x.detail ? '|detail' : ''}`);
    const missing = new Map<string, Task>();
    const waits: Promise<void>[] = [];
    const t = this.a2tally(tag);

    keys.forEach((k, i) => {
      if (missing.has(k)) return;

      const pending = this.a2inflight.get(k);

      if (pending) {
        waits.push(pending);
        this.hits++;
        t.hits++;
        return;
      }
      if (this.store.read('points', k)) {
        this.hits++;
        t.hits++;
        return;
      }

      const x = items[i]!;

      missing.set(k, {
        k,
        quad: quadOf(x.cfg),
        controls: x.cfg.controls,
        options: x.options,
        detail: Boolean(x.detail)
      });
    });

    if (missing.size) {
      const settle = new Map<string, { resolve: () => void; reject: (e: unknown) => void }>();

      for (const k of missing.keys()) {
        const p = new Promise<void>((resolve, reject) => settle.set(k, { resolve, reject }));

        p.catch(() => undefined);
        this.a2inflight.set(k, p);
      }

      try {
        if (!this.a2started) {
          this.a2started = true;
          await this.pool.start();
        }

        const tasks = [...missing.values()];
        const chunk = this.o.queueChunk ?? 4096;

        for (let i = 0; i < tasks.length; i += chunk)
          await this.pool.run<SRec | DRec>(tasks.slice(i, i + chunk), (task, record, ms) => {
            this.store.write('points', task.k, record);
            this.fresh++;
            this.evalMs += ms;
            t.fresh++;
            t.ms += ms;
            this.a2inflight.delete(task.k);
            settle.get(task.k)!.resolve();
            if (this.o.stopAfterFresh !== undefined && this.fresh >= this.o.stopAfterFresh)
              this.pool.requestStop(`stop-after ${this.o.stopAfterFresh} fresh evaluations (resume test)`);
          });
      } catch (error) {
        for (const [k, x] of settle)
          if (this.a2inflight.get(k)) {
            this.a2inflight.delete(k);
            x.reject(error);
          }
        throw error;
      }
    }

    await Promise.all(waits);

    if (this.o.maxFresh !== undefined && this.archivedAtOpen + this.fresh > this.o.maxFresh)
      throw new Error(
        `job ${this.o.job}: ${this.archivedAtOpen + this.fresh} unique fresh evaluations exceed its frozen cap ${this.o.maxFresh}`
      );

    return keys.map((k) => {
      const r = this.store.read<R>('points', k);

      if (!r) throw new Error(`${k} missing after evaluation`);
      return r;
    });
  }
}
