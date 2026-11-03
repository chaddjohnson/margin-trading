// Phenotype architectures: the named parameter vectors a family of strategy files takes, each parameter with its
// unit, its valid range and the conversion from its JSON value to the number the strategy file uses.
//
// Units in the JSON files:
// - percent: a string in percentage points with a '%' sign and at most one decimal, so "29.9%" is 0.299 and
//   "0.3%" is 0.003. Bare numbers are rejected, which rules out confusing 29.9 with 0.299. The value is held on
//   the integer grid of tenths of a percentage point (299) and converted as tenths / 1000, which is the same
//   double as the decimal literal the strategy files ship (299 / 1000 === 0.299).
// - calendarDays and sessions: JSON integers.
//
// Adding a symbol or a phenotype only takes a JSON file under config/phenotypes/<architecture>/. Adding an
// architecture takes an entry here and a compatibility entry per strategy file in strategies.ts.

export class PhenotypeError extends Error {
  override name = 'PhenotypeError';
}

export type ParameterUnit = 'percent' | 'calendarDays' | 'sessions';

export interface ParameterSpec {
  name: string;
  short: string;
  unit: ParameterUnit;
  // On the parameter's grid: tenths of a percentage point for percent, the count itself otherwise.
  min: number;
  max: number;
  description: string;
}

export interface Architecture {
  name: string; // also the directory under config/phenotypes/
  description: string;
  reference: string; // the strategy file whose shipped constants define the architecture's parameters
  parameters: ParameterSpec[];
}

export const architectures: Record<string, Architecture> = {
  D1: {
    name: 'D1',
    description:
      'Trailing buy armed by an X decline from the L-session reference high, buying on a Y rebound from the trailing low; trailing stop, maximum-hold and buffered intraday loss exits; post-exit continuation (a P pullback within W sessions of a profitable exit also arms)',
    reference: 'src/app/allIn-trailingBuy-postExitContinuation.ts',
    parameters: [
      {
        name: 'targetPercentChange',
        short: 'X',
        unit: 'percent',
        min: 1,
        max: 999,
        description: 'decline from the reference high that arms a trailing buy'
      },
      {
        name: 'trailingBuyPercentage',
        short: 'Y',
        unit: 'percent',
        min: 1,
        max: 1000,
        description: 'rebound from the trailing low that buys'
      },
      {
        name: 'trailingStopPercentage',
        short: 'stop',
        unit: 'percent',
        min: 1,
        max: 999,
        description: 'trailing stop below the post-entry high'
      },
      {
        name: 'maximumHoldDays',
        short: 'hold',
        unit: 'calendarDays',
        min: 1,
        max: 3650,
        description: 'calendar days before the loss exits apply'
      },
      {
        name: 'tickWindowSize',
        short: 'L',
        unit: 'sessions',
        min: 1,
        max: 2000,
        description: 'sessions of the rolling reference high, and the warm-up'
      },
      {
        name: 'intradayLossBuffer',
        short: 'buffer',
        unit: 'percent',
        min: 0,
        max: 999,
        description: 'net loss, as a share of the investment, that sells from the hold day'
      },
      {
        name: 'pullback',
        short: 'P',
        unit: 'percent',
        min: 0,
        max: 999,
        description: 'pullback from the post-exit high that arms within the continuation window'
      },
      {
        name: 'continuationWindow',
        short: 'W',
        unit: 'sessions',
        min: 1,
        max: 100000,
        description: 'sessions after a profitable exit during which the pullback can arm'
      }
    ]
  }
};

export const architectureOf = (name: string): Architecture => {
  const architecture = architectures[name];

  if (!architecture) {
    throw new PhenotypeError(
      `Unknown phenotype architecture '${name}' (known: ${Object.keys(architectures).join(', ')})`
    );
  }

  return architecture;
};

// A parameter as the strategy will use it.
export interface ResolvedParameter {
  name: string;
  spec: ParameterSpec;
  grid: number; // tenths of a percentage point, or the count
  value: number; // the fraction or the count the strategy file uses
  display: string; // "29.9%", "8 calendar days", "74 sessions"
}

const unitLabels: Record<Exclude<ParameterUnit, 'percent'>, string> = {
  calendarDays: 'calendar days',
  sessions: 'sessions'
};

export const formatTenths = (tenths: number) => `${(tenths / 10).toFixed(1)}%`;

export const formatOnGrid = (spec: ParameterSpec, grid: number) =>
  spec.unit === 'percent' ? formatTenths(grid) : `${grid} ${unitLabels[spec.unit]}`;

// The strategy file's own value (a fraction or a count) in the parameter's display unit.
export const formatValue = (spec: ParameterSpec, value: number) => {
  if (spec.unit !== 'percent') {
    return `${value} ${unitLabels[spec.unit]}`;
  }

  const text = String(Number((value * 100).toFixed(4)));

  return `${text.includes('.') ? text : `${text}.0`}%`;
};

const percentPattern = /^(0|[1-9]\d{0,3})(?:\.(\d))?%$/;

// Converts one JSON value to its grid value, with a message that names the expected unit on any mistake.
export const parseParameter = (spec: ParameterSpec, raw: unknown, where: string): ResolvedParameter => {
  const fail = (message: string): never => {
    throw new PhenotypeError(`${where}: ${spec.name} ${message}`);
  };
  let grid: number;

  if (spec.unit === 'percent') {
    if (typeof raw === 'number') {
      const hint = raw > 0 && raw < 1 ? `"${Number((raw * 100).toFixed(4))}%"` : `"${raw}%"`;

      fail(
        `must be a percentage string in percentage points such as "29.9%", not the number ${raw} (did you mean ${hint}?)`
      );
    }

    if (typeof raw !== 'string') {
      fail(`must be a percentage string such as "29.9%", not ${JSON.stringify(raw)}`);
    }

    const text = raw as string;

    if (!text.endsWith('%')) {
      fail(`"${text}" must end with '%': percentages are written in percentage points, e.g. "29.9%" for 0.299`);
    }

    if (/^\d+\.\d{2,}%$/.test(text)) {
      fail(`"${text}" is off the 0.1 percentage-point grid: use at most one decimal, e.g. "29.9%"`);
    }

    const match = text.match(percentPattern);

    if (!match) {
      fail(`"${text}" is not a percentage such as "29.9%" (digits, at most one decimal, then '%')`);
    }

    grid = Number(match![1]) * 10 + Number(match![2] ?? 0);
  } else {
    if (typeof raw !== 'number' || !Number.isInteger(raw)) {
      fail(`must be a JSON integer (${unitLabels[spec.unit]}), not ${JSON.stringify(raw)}`);
    }

    grid = raw as number;
  }

  if (grid < spec.min || grid > spec.max) {
    fail(`${formatOnGrid(spec, grid)} is outside ${formatOnGrid(spec, spec.min)} to ${formatOnGrid(spec, spec.max)}`);
  }

  return {
    name: spec.name,
    spec,
    grid,
    value: spec.unit === 'percent' ? grid / 1000 : grid,
    display: formatOnGrid(spec, grid)
  };
};

// The closest known name, for "did you mean" hints on misspelled keys.
export const closestName = (name: string, candidates: readonly string[]) => {
  const distance = (a: string, b: string) => {
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i++) {
      let previous = row[0]!;

      row[0] = i;

      for (let j = 1; j <= b.length; j++) {
        const current = row[j]!;

        row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = current;
      }
    }

    return row[b.length]!;
  };
  const ranked = candidates
    .map((candidate) => ({ candidate, score: distance(name.toLowerCase(), candidate.toLowerCase()) }))
    .sort((a, b) => a.score - b.score);

  return ranked[0] && ranked[0].score <= Math.max(2, Math.floor(name.length / 3)) ? ranked[0].candidate : undefined;
};
