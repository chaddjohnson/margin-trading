// Fixed settings of the trailing-buy entry study (research/trailing-buy-entry). Everything here is
// pre-registered in PROTOCOL.md; a change needs a protocol amendment.

import { optimizationDatasetFile } from '#lib';

export const studyDir = 'research/trailing-buy-entry';
export const resultsDir = `${studyDir}/results`;
export const chartsDir = `${studyDir}/charts`;

// The immutable daily strategy. Only read, never edited (a test checks the hash).
export const originalFile = 'src/app/allin-original.ts';
export const originalSha256 = '42f2b7e7be4ef99e1af6c4fe113dd8da9ed4d329d2fe0564463db80b87f449e2';

// Data: the repository's continuous VGT daily file (Stooq back-adjusted history extended with the user's
// 2026 file) plus the one later session that only the 2026 file has. Both inputs are git-ignored; the
// combined file is derived deterministically (data.ts) into a git-ignored folder.
export const vgtHistoryFile = 'data/VGT/VGT-2005-2026.csv';
export const vgtHistorySha256 = '3aaf182bf188ba6f3967185102dc5dfc34e8dbd46794192428b2e88bc19dbb9d';
export const vgt2026File = 'data/VGT/VGT-2026.csv';
export const vgt2026Sha256 = '734409cff831388d6c338e11109cf9eb92e3fccbc4ebb36bd950dd3af17800c9';
export const repoDefaultFile = 'data/VGT/VGT-2016-2026.csv';
export const derivedDir = 'data/trailing-buy-entry';
export const vgtCombinedFile = `${derivedDir}/VGT-daily-2005-02-25_2026-10-14.csv`;
export const stooqDir = 'data/stooq/processed';
// The training partition (src/lib/dataset.ts); the research ran on the legacy data/VGT/VGT-2016-2025-1-minute.csv.
export const minuteFile = optimizationDatasetFile('VGT');
export const crossAssetSymbols = ['QQQ', 'VOOG', 'SOXX', 'IGV', 'XLY', 'IWN'];

// Research universe. Signals from the first session of 2014; earlier bars are history only (reference
// highs and ATR warm-up). Development = training + walk-forward validation; the holdout is the latest tail.
export const researchStart = '2014-01-02';
export const developmentEnd = '2022-12-30';
export const holdoutStart = '2023-01-03';
export const holdoutEnd = '2026-10-14';

export interface Fold {
  id: string;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
}

// Anchored (expanding) walk-forward inside the development period, plus the final fit on the whole
// development period whose test window is the holdout.
export const walkForwardFolds: Fold[] = [
  { id: 'WF1', trainStart: researchStart, trainEnd: '2017-12-29', testStart: '2018-01-02', testEnd: '2019-12-31' },
  { id: 'WF2', trainStart: researchStart, trainEnd: '2019-12-31', testStart: '2020-01-02', testEnd: '2021-12-31' },
  { id: 'WF3', trainStart: researchStart, trainEnd: '2021-12-31', testStart: '2022-01-03', testEnd: developmentEnd }
];

export const finalFold: Fold = {
  id: 'FINAL',
  trainStart: researchStart,
  trainEnd: developmentEnd,
  testStart: holdoutStart,
  testEnd: holdoutEnd
};

export const investment = 100000;
export const marginRate = 0.11;
export const marginRateSensitivities = [0.08, 0.095, 0.11, 0.125, 0.14];
