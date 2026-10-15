// The chronological protocol of the VGT minute study (the brief's §4), fixed before any search ran.
//
// Every window starts flat (no position, no restriction) on its first session. All earlier sessions in
// the file, back to 2016-01-04, are visible as reference-high history only. A position still open on a
// window's last session is marked to that close, net of the interest accrued through it, and counts.
// Nothing carries over from training into validation, and validation simulations receive parameters fixed
// by the training run before the validation window is simulated.
export interface DateWindow {
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive
}

export interface Fold {
  id: string;
  train: DateWindow;
  validation: DateWindow;
}

export interface MinuteProtocol {
  name: string;
  researchEnd: string; // nothing after this date is visible before the final-evaluation unlock
  folds: Fold[];
  final: { id: string; train: DateWindow };
  holdout: { start: string; end: string | 'latest' };
}

const trainStart = '2016-10-07';

export const defaultMinuteProtocol: MinuteProtocol = {
  name: 'vgt-minute-expanding-2016-v1',
  researchEnd: '2023-12-31',
  folds: [2020, 2021, 2022, 2023].map((year) => ({
    id: `fold-${year}`,
    train: { start: trainStart, end: `${year - 1}-12-31` },
    validation: { start: `${year}-01-01`, end: `${year}-12-31` }
  })),
  final: { id: 'final-2016-2023', train: { start: trainStart, end: '2023-12-31' } },
  holdout: { start: '2024-01-01', end: 'latest' }
};

export const validateProtocol = (protocol: MinuteProtocol) => {
  for (const fold of protocol.folds) {
    if (fold.train.end >= fold.validation.start) {
      throw new Error(`${fold.id}: training must end before validation starts`);
    }

    if (fold.validation.end > protocol.researchEnd) {
      throw new Error(`${fold.id}: validation must end by the research end ${protocol.researchEnd}`);
    }
  }

  if (protocol.final.train.end > protocol.researchEnd) {
    throw new Error('The final development window must end by the research end');
  }

  if (protocol.holdout.start <= protocol.researchEnd) {
    throw new Error('The final evaluation must start after the research end');
  }
};
