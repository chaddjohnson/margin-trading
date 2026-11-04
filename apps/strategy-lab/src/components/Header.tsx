import type { Dataset } from '../schema/types.ts';

export function Header({ dataset }: { dataset: Dataset }) {
  const bars = dataset.priceSeries.bars;
  const first = bars[0]?.d ?? '';
  const last = bars[bars.length - 1]?.d ?? '';
  const synthetic = dataset.provenance.kind === 'synthetic';
  return (
    <header className="app-header">
      <div className="brand">
        <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="13" width="4" height="9" rx="1" />
          <rect x="9" y="8" width="4" height="14" rx="1" />
          <rect x="16" y="3" width="4" height="19" rx="1" />
        </svg>
        <div>
          <h1>Strategy Entry Explorer</h1>
          <p className="brand-sub">Entry exploration prototype</p>
        </div>
      </div>
      {synthetic && (
        <span className="demo-badge" data-testid="demo-badge">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1.5 15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M8 6v3.6M8 11.4v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          DEMO / SYNTHETIC DATA
        </span>
      )}
      <nav className="view-tabs" aria-label="Views">
        <span className="view-tab is-active" aria-current="page">
          Entries (analysis)
        </span>
        <span className="view-tab is-disabled" aria-disabled="true" title="Planned for a later phase; not available">
          Backtest with exits <span className="planned">planned</span>
        </span>
      </nav>
      <div className="header-context" aria-label="Dataset context">
        <span className="ctx-symbol">{dataset.instrument.symbol}</span>
        <span className="ctx-detail">
          {synthetic ? 'illustrative label · synthetic prices' : dataset.instrument.label}
        </span>
        <span className="ctx-sep" aria-hidden="true" />
        <span className="ctx-range">
          {first} – {last}
        </span>
        <span className="ctx-detail">
          {dataset.priceSeries.interval === '1d' ? 'daily' : dataset.priceSeries.interval}
        </span>
      </div>
    </header>
  );
}

export function DemoBanner({ dataset }: { dataset: Dataset }) {
  const p = dataset.provenance;
  if (p.kind !== 'synthetic') return null;
  return (
    <section className="demo-banner" role="note" aria-label="Demo data disclosure" data-testid="demo-banner">
      <strong>Demonstration data.</strong>
      <ul>
        {p.disclosures.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </section>
  );
}
