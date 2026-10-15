// The required default target universe. Every one of these symbols is an optimization target; none may be
// silently dropped or replaced. Additional symbols are reported separately as a supplemental universe.
export interface UniverseMember {
  symbol: string;
  group: string;
  kind: 'ETF' | 'stock';
}

export const requiredUniverse: UniverseMember[] = [
  { symbol: 'VGT', group: 'Technology-heavy / software ETFs', kind: 'ETF' },
  { symbol: 'XLK', group: 'Technology-heavy / software ETFs', kind: 'ETF' },
  { symbol: 'QQQ', group: 'Technology-heavy / software ETFs', kind: 'ETF' },
  { symbol: 'IGV', group: 'Technology-heavy / software ETFs', kind: 'ETF' },
  { symbol: 'VOOG', group: 'Broad US market / large-cap growth ETFs', kind: 'ETF' },
  { symbol: 'VOO', group: 'Broad US market / large-cap growth ETFs', kind: 'ETF' },
  { symbol: 'SPY', group: 'Broad US market / large-cap growth ETFs', kind: 'ETF' },
  { symbol: 'SMH', group: 'Semiconductor ETFs', kind: 'ETF' },
  { symbol: 'SOXX', group: 'Semiconductor ETFs', kind: 'ETF' },
  { symbol: 'VUG', group: 'Diversified growth ETFs', kind: 'ETF' },
  { symbol: 'SCHG', group: 'Diversified growth ETFs', kind: 'ETF' },
  { symbol: 'IWF', group: 'Diversified growth ETFs', kind: 'ETF' },
  { symbol: 'XLY', group: 'Consumer discretionary ETF', kind: 'ETF' },
  { symbol: 'IWN', group: 'US small-cap value ETF', kind: 'ETF' },
  { symbol: 'NVDA', group: 'Individual stocks', kind: 'stock' },
  { symbol: 'AAPL', group: 'Individual stocks', kind: 'stock' },
  { symbol: 'MSFT', group: 'Individual stocks', kind: 'stock' },
  { symbol: 'AMD', group: 'Individual stocks', kind: 'stock' },
  { symbol: 'META', group: 'Individual stocks', kind: 'stock' },
  { symbol: 'GOOGL', group: 'Individual stocks', kind: 'stock' },
  { symbol: 'AMZN', group: 'Individual stocks', kind: 'stock' }
];

export const requiredSymbols = requiredUniverse.map((member) => member.symbol);

export const isRequired = (symbol: string) => requiredSymbols.includes(symbol);

// Resolves a CLI selection: 'default' (the 21 required symbols), or a comma-separated list.
export const resolveSymbols = (selection: string | undefined): string[] => {
  if (!selection || selection === 'default' || selection === 'all') {
    return [...requiredSymbols];
  }

  const symbols = selection
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  for (const symbol of symbols) {
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) {
      throw new Error(`Invalid symbol ${JSON.stringify(symbol)}`);
    }
  }

  return [...new Set(symbols)];
};
