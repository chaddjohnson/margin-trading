// The chronological evaluation protocol. Every date is explicit and can be overridden with a JSON file
// (--protocol path); the defaults are the study's pre-declared design.
import fs from 'fs-extra';

export interface Window {
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive YYYY-MM-DD
}

export interface Fold {
  id: string;
  train: Window;
  validation: Window;
}

export interface Protocol {
  name: string;
  researchEnd: string; // nothing after this date is visible before the holdout unlock
  folds: Fold[];
  final: { id: string; train: Window };
  holdout: { start: string; end: string | 'latest' };
  stress: Window;
  // Sessions of history required before a window's first session, so every candidate's reference-high
  // window is complete (the parameter space's largest lookback).
  warmupSessions: number;
  // A window counts as covered when the data starts within this many calendar days after its start and
  // ends within this many before its end.
  coverageToleranceDays: number;
}

const expandingFold = (year: number): Fold => ({
  id: `fold-${year}`,
  train: { start: '2014-01-01', end: `${year - 1}-12-31` },
  validation: { start: `${year}-01-01`, end: `${year}-12-31` }
});

export const defaultProtocol: Protocol = {
  name: 'expanding-2014-annual-v1',
  researchEnd: '2023-12-31',
  folds: [2019, 2020, 2021, 2022, 2023].map(expandingFold),
  final: { id: 'final-2014-2023', train: { start: '2014-01-01', end: '2023-12-31' } },
  holdout: { start: '2024-01-01', end: 'latest' },
  stress: { start: '2005-01-01', end: '2013-12-31' },
  warmupSessions: 250,
  coverageToleranceDays: 7
};

export const validateProtocol = (protocol: Protocol) => {
  for (const fold of protocol.folds) {
    if (fold.train.end >= fold.validation.start) {
      throw new Error(`${fold.id}: training must end before validation starts`);
    }

    if (fold.validation.end > protocol.researchEnd) {
      throw new Error(`${fold.id}: validation ends after the research end ${protocol.researchEnd}`);
    }
  }

  if (protocol.final.train.end > protocol.researchEnd) {
    throw new Error('The final training window must end by the research end');
  }

  if (protocol.holdout.start <= protocol.researchEnd) {
    throw new Error('The holdout must start after the research end');
  }

  if (protocol.stress.end >= (protocol.folds[0]?.train.start ?? protocol.final.train.start)) {
    throw new Error('The stress window must end before the first training window');
  }
};

export const loadProtocol = async (file?: string): Promise<Protocol> => {
  if (!file) {
    return defaultProtocol;
  }

  const protocol = { ...defaultProtocol, ...((await fs.readJson(file)) as Partial<Protocol>) };

  validateProtocol(protocol);

  return protocol;
};
