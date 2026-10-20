// Trade-level attribution of a candidate against a reference trade list (Trades2, or a family's own baseline)
// on the same continuous run: which reference trades the candidate preserved, diminished, missed, avoided,
// reduced or magnified, and which trades are new. Trades are matched by overlapping held intervals (session
// indices); a candidate trade can match at most one reference trade and vice versa (greedy by overlap).
export interface AttributionTrade {
  entryIndex: number;
  exitIndex: number; // -1 while open
  entryDate: string;
  exitDate: string;
  profit: number;
  interest: number;
  holdDays: number;
  legs?: number;
}

export type MatchClass =
  | 'preserved' // reference profitable, candidate within 10% or better
  | 'diminished' // reference profitable, candidate profitable but at least 10% lower
  | 'turned to loss' // reference profitable, candidate not profitable
  | 'missed' // reference profitable, no candidate trade overlaps
  | 'reduced' // reference losing, candidate loses less (or gains)
  | 'magnified' // reference losing, candidate loses at least as much
  | 'avoided'; // reference losing, no candidate trade overlaps

export interface Match {
  reference: AttributionTrade;
  candidate?: AttributionTrade;
  overlapSessions: number;
  classification: MatchClass;
  difference: number; // candidate profit - reference profit (missed/avoided: -reference)
}

export interface Attribution {
  matches: Match[];
  newTrades: AttributionTrade[];
  summary: Record<
    MatchClass | 'new',
    { count: number; referenceProfit: number; candidateProfit: number; difference: number }
  >;
  referenceNet: number;
  candidateNet: number;
  referenceInterest: number;
  candidateInterest: number;
  referenceHoldDays: number;
  candidateHoldDays: number;
}

const overlap = (a: AttributionTrade, b: AttributionTrade, endIndex: number) => {
  const aEnd = a.exitIndex < 0 ? endIndex : a.exitIndex;
  const bEnd = b.exitIndex < 0 ? endIndex : b.exitIndex;

  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(a.entryIndex, b.entryIndex) + 1);
};

export const attribute = (
  reference: AttributionTrade[],
  candidate: AttributionTrade[],
  endIndex: number
): Attribution => {
  const pairs: { r: number; c: number; sessions: number }[] = [];

  reference.forEach((ref, r) => {
    candidate.forEach((cand, c) => {
      const sessions = overlap(ref, cand, endIndex);

      if (sessions > 0) {
        pairs.push({ r, c, sessions });
      }
    });
  });
  pairs.sort((a, b) => b.sessions - a.sessions || a.r - b.r || a.c - b.c);

  const matchedReference = new Map<number, { c: number; sessions: number }>();
  const matchedCandidate = new Set<number>();

  for (const pair of pairs) {
    if (!matchedReference.has(pair.r) && !matchedCandidate.has(pair.c)) {
      matchedReference.set(pair.r, { c: pair.c, sessions: pair.sessions });
      matchedCandidate.add(pair.c);
    }
  }

  const matches: Match[] = reference.map((ref, r) => {
    const match = matchedReference.get(r);
    const cand = match ? candidate[match.c] : undefined;
    let classification: MatchClass;

    if (ref.profit > 0) {
      if (!cand) {
        classification = 'missed';
      } else if (cand.profit <= 0) {
        classification = 'turned to loss';
      } else if (cand.profit >= 0.9 * ref.profit) {
        classification = 'preserved';
      } else {
        classification = 'diminished';
      }
    } else if (!cand) {
      classification = 'avoided';
    } else if (cand.profit > ref.profit) {
      classification = 'reduced';
    } else {
      classification = 'magnified';
    }

    return {
      reference: ref,
      candidate: cand,
      overlapSessions: match?.sessions ?? 0,
      classification,
      difference: (cand?.profit ?? 0) - ref.profit
    };
  });
  const newTrades = candidate.filter((_trade, c) => !matchedCandidate.has(c));
  const classes: (MatchClass | 'new')[] = [
    'preserved',
    'diminished',
    'turned to loss',
    'missed',
    'reduced',
    'magnified',
    'avoided',
    'new'
  ];
  const summary = Object.fromEntries(
    classes.map((cls) => [cls, { count: 0, referenceProfit: 0, candidateProfit: 0, difference: 0 }])
  ) as Attribution['summary'];

  for (const match of matches) {
    const entry = summary[match.classification];

    entry.count++;
    entry.referenceProfit += match.reference.profit;
    entry.candidateProfit += match.candidate?.profit ?? 0;
    entry.difference += match.difference;
  }

  for (const trade of newTrades) {
    summary.new.count++;
    summary.new.candidateProfit += trade.profit;
    summary.new.difference += trade.profit;
  }

  const sum = (trades: AttributionTrade[], field: 'profit' | 'interest' | 'holdDays') =>
    trades.reduce((total, trade) => total + trade[field], 0);

  return {
    matches,
    newTrades,
    summary,
    referenceNet: sum(reference, 'profit'),
    candidateNet: sum(candidate, 'profit'),
    referenceInterest: sum(reference, 'interest'),
    candidateInterest: sum(candidate, 'interest'),
    referenceHoldDays: sum(reference, 'holdDays'),
    candidateHoldDays: sum(candidate, 'holdDays')
  };
};
