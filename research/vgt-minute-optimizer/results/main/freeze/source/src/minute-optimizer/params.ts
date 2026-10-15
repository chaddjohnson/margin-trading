// The minute optimizer's search space: the seven numerical decision constants of src/app/allIn.ts, each on
// an explicit integer grid. Percentages are integer tenths of a percentage point (25 = 2.5%), durations are
// whole calendar days or trading sessions. Genomes are integer grid indices (value = min + index x step),
// and the daily optimizer's grid utilities (src/optimizer/params.ts) are reused unchanged: sampling,
// crossover, mutation, caching, candidate IDs and outputs all work on the same integer vector.
//
// The bounds are the brief's (§5). They include the incumbent and much shallower and deeper styles. The
// space name is part of every candidate ID, so IDs never collide with the daily study's.
import type { MinuteParams } from '../app/allIn-minute-optimizable.ts';
import { incumbentParams } from '../app/allIn-minute-optimizable.ts';
import { type ParameterSpace, paramsToGenome } from '../optimizer/params.ts';

export const minuteParameterSpace: ParameterSpace = {
  name: 'allin-minute-v1',
  specs: [
    {
      key: 'dipTenths',
      label: 'Entry dip: decision price below the reference high',
      unit: 'tenths of a percentage point',
      min: 5,
      max: 250,
      step: 1,
      neighborhoodRadius: 5,
      rationale: '0.5%-25.0%: from buying almost any small pullback to waiting for a deep correction.'
    },
    {
      key: 'trailingStopTenths',
      label: 'Trailing stop below the post-entry high',
      unit: 'tenths of a percentage point',
      min: 5,
      max: 200,
      step: 1,
      neighborhoodRadius: 5,
      rationale: '0.5%-20.0%: from inside a typical day of VGT noise to wider than most corrections.'
    },
    {
      key: 'maximumHoldDays',
      label: 'Maximum hold before a losing position is sold after the opening trade',
      unit: 'calendar days',
      min: 1,
      max: 60,
      step: 1,
      neighborhoodRadius: 2,
      rationale:
        '1-60 calendar days (not sessions). 1 is checked from the first session after the entry; the entry session is never checked for exits.'
    },
    {
      key: 'lookbackSessions',
      label: 'Reference-high window',
      unit: 'sessions',
      min: 10,
      max: 250,
      step: 1,
      neighborhoodRadius: 10,
      rationale: '10-250 trading sessions (not minutes or calendar days), excluding the signal session.'
    },
    {
      key: 'materialLossTenths',
      label: 'Material ETF price loss (interest excluded) that restricts re-entry',
      unit: 'tenths of a percentage point',
      min: 0,
      max: 100,
      step: 1,
      neighborhoodRadius: 3,
      rationale:
        '0.0%-10.0%: 0% restricts after any non-positive price return; near 10% few exits restrict, which approaches no restriction.'
    },
    {
      key: 'lowerReentryTenths',
      label: 'Extra decline below the frozen loss-exit price required to re-enter',
      unit: 'tenths of a percentage point',
      min: 0,
      max: 150,
      step: 1,
      neighborhoodRadius: 5,
      rationale: '0.0%-15.0%: 0% allows re-entry at or below the loss-exit price.'
    },
    {
      key: 'retraceTenths',
      label: 'Recovery of the reference-high-to-episode-low decline that clears the restriction',
      unit: 'tenths of a percentage point',
      min: 0,
      max: 1000,
      step: 1,
      neighborhoodRadius: 50,
      rationale:
        '0.0%-100.0%. 0% clears on the exit session itself (no restriction in effect); 100% waits for a full recovery to the frozen reference high.'
    }
  ]
};

// The 10%/8% family that src/app/allIn.ts used before the current constants (git HEAD b7abde6), as a
// diagnostic control only. All seven values are stated here rather than imported from another file.
export const deepDipParams: Readonly<MinuteParams> = Object.freeze({
  dipTenths: 100,
  trailingStopTenths: 80,
  maximumHoldDays: 15,
  lookbackSessions: 90,
  materialLossTenths: 10,
  lowerReentryTenths: 20,
  retraceTenths: 380
});

export const controls = [
  { id: 'incumbent', label: 'Incumbent (src/app/allIn.ts constants)', params: incumbentParams },
  { id: 'deep-dip', label: 'Deep-dip diagnostic control (allIn.ts at HEAD b7abde6)', params: deepDipParams }
] as const;

export const incumbentGenome = () => paramsToGenome(minuteParameterSpace, incumbentParams);
