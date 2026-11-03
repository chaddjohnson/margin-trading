import type { ExplorerModel } from '../data/model.ts';
import { formatCount } from '../format.ts';

export function StatusBar({ model }: { model: ExplorerModel }) {
  const d = model.dataset;
  const g = d.provenance.generator;
  const { aligned, unaligned, policy } = model.alignment;
  return (
    <footer className="status-bar" data-testid="status-bar">
      <span>
        Dataset <b className="mono">{d.datasetId}</b> · schema v{d.schemaVersion}
      </span>
      <span>
        Provenance <b>{d.provenance.kind}</b>
        {g ? ` (${g.name} ${g.version}, seed ${g.seed})` : ''}
      </span>
      <span>
        {formatCount(d.priceSeries.bars.length)} {d.priceSeries.interval} bars · prices {d.instrument.currency},{' '}
        adjustment {d.instrument.priceAdjustment} · times {model.timeZone}
      </span>
      <span data-testid="alignment-status">
        Alignment <b>{policy}</b>: {formatCount(aligned)} of {formatCount(aligned + unaligned.length)} events on their
        bars
      </span>
      {unaligned.length > 0 && (
        <details className="unaligned" open>
          <summary role="alert">
            {unaligned.length} event{unaligned.length > 1 ? 's' : ''} matched no bar and are not drawn
          </summary>
          <ul>
            {unaligned.slice(0, 50).map((e) => (
              <li key={e.id} className="mono">
                {e.id} ({e.t})
              </li>
            ))}
          </ul>
        </details>
      )}
      {d.executionModel && (
        <details className="exec-model">
          <summary>Execution model: {d.executionModel.label}</summary>
          <p>{d.executionModel.description}</p>
        </details>
      )}
    </footer>
  );
}
