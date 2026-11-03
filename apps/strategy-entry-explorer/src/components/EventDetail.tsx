import type { ExplorerModel, PlacedEvent } from '../data/model.ts';
import { formatClock, formatParameter, formatPrice } from '../format.ts';
import type { Role } from '../state/explorer.ts';
import type { Cluster } from '../state/selectors.ts';
import { Swatch, TYPE_LABEL } from './Swatch.tsx';

interface Props {
  model: ExplorerModel;
  event: PlacedEvent | null;
  role: Role | null;
  cluster: Cluster | null;
  position: { index: number; total: number } | null;
  onSelect: (id: string, locate: boolean) => void;
  onStep: (delta: number) => void;
  onCenter: () => void;
  onZoom: () => void;
}

export function EventDetail({ model, event, role, cluster, position, onSelect, onStep, onCenter, onZoom }: Props) {
  if (!event || !role) {
    return (
      <section className="card detail-card" aria-label="Selected event" data-testid="event-detail">
        <h2>Selected event</h2>
        <p className="muted empty-state">
          Hover a marker for a summary; click a marker or a table row to pin its details here. A stacked marker holds
          several events on one bar — clicking it again steps through them.
        </p>
      </section>
    );
  }
  const vm = model.variationById.get(event.variationId);
  const bar = model.dataset.priceSeries.bars[event.barIndex];
  const linked = event.linkedEventId ? model.eventById.get(event.linkedEventId) : undefined;
  const tz = model.timeZone;
  return (
    <section
      className="card detail-card"
      aria-label="Selected event"
      data-testid="event-detail"
      data-event-id={event.id}
    >
      <div className="detail-head">
        <h2>Selected event</h2>
        <div className="detail-nav">
          <button
            type="button"
            className="btn-chip"
            onClick={() => onStep(-1)}
            disabled={!position || position.index === 0}
            aria-label="Previous drawn event"
          >
            ◀
          </button>
          <span className="muted small" aria-live="polite">
            {position ? `${position.index + 1} / ${position.total}` : ''}
          </span>
          <button
            type="button"
            className="btn-chip"
            onClick={() => onStep(1)}
            disabled={!position || position.index === position.total - 1}
            aria-label="Next drawn event"
          >
            ▶
          </button>
          <button type="button" className="btn-chip" onClick={onCenter}>
            Centre
          </button>
          <button type="button" className="btn-chip" onClick={onZoom}>
            Zoom ±3M
          </button>
        </div>
      </div>
      <div className="detail-title">
        <span className={`role-badge role-badge-${role.toLowerCase()}`}>{role}</span>
        <Swatch role={role} type={event.type} />
        <span className={`type-pill type-${event.type}`}>
          {TYPE_LABEL[event.type]}
          {event.type === 'executed' && model.dataset.executionModel?.isIllustrative ? ' (illustrative)' : ''}
        </span>
        <span className="detail-var">
          {vm?.variation.code} · {vm?.variation.name}
        </span>
      </div>
      <div className="detail-body">
        <dl className="detail-grid">
          <dt>Session date</dt>
          <dd data-testid="detail-date">{event.d}</dd>
          <dt>Time</dt>
          <dd>
            {formatClock(Date.parse(event.t), tz)} <span className="muted">({event.t})</span>
          </dd>
          <dt>Price</dt>
          <dd data-testid="detail-price">
            {formatPrice(event.price)} {model.dataset.instrument.currency}{' '}
            <span className="muted">
              ({event.priceBasis.replace('-', ' ')}
              {model.dataset.instrument.isSynthetic ? ', synthetic' : ''})
            </span>
          </dd>
          {bar && bar.c !== event.price && (
            <>
              <dt>Bar close</dt>
              <dd>{formatPrice(bar.c)}</dd>
            </>
          )}
          <dt>Trigger</dt>
          <dd className="detail-trigger">{event.trigger.summary}</dd>
          {event.type === 'signal' && (
            <>
              <dt>Execution</dt>
              <dd>
                {event.execution?.status === 'executed' && linked ? (
                  <>
                    Executed →{' '}
                    <button type="button" className="link" onClick={() => onSelect(linked.id, true)}>
                      {linked.d}
                    </button>
                  </>
                ) : (
                  <>Not executed{event.execution?.reason ? `: ${event.execution.reason}` : ''}</>
                )}
              </dd>
            </>
          )}
          {event.type === 'executed' && linked && (
            <>
              <dt>From signal</dt>
              <dd>
                <button type="button" className="link" onClick={() => onSelect(linked.id, true)}>
                  {linked.d}
                </button>
              </dd>
            </>
          )}
          <dt>Event ID</dt>
          <dd className="mono">{event.id}</dd>
        </dl>
        <div className="detail-block">
          {event.trigger.values.length > 0 && (
            <table className="kv-table">
              <caption>Trigger values</caption>
              <tbody>
                {event.trigger.values.map((p) => (
                  <tr key={p.key}>
                    <th scope="row">{p.label}</th>
                    <td>{formatParameter(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="detail-block">
          {vm && vm.variation.parameters.length > 0 && (
            <details className="params" open>
              <summary>Variation parameters</summary>
              <table className="kv-table">
                <tbody>
                  {vm.variation.parameters.map((p) => (
                    <tr key={p.key}>
                      <th scope="row">{p.label}</th>
                      <td>{formatParameter(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
          {cluster && cluster.items.length > 1 && (
            <div className="same-bar">
              <h3>Events on this bar ({cluster.items.length})</h3>
              <ul>
                {cluster.items.map((d) => (
                  <li key={d.event.id}>
                    <button
                      type="button"
                      className={`same-bar-item${d.event.id === event.id ? ' is-current' : ''}`}
                      aria-current={d.event.id === event.id}
                      onClick={() => onSelect(d.event.id, false)}
                    >
                      <Swatch role={d.role} type={d.event.type} /> {d.role} ·{' '}
                      {model.variationById.get(d.event.variationId)?.variation.code} · {TYPE_LABEL[d.event.type]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
