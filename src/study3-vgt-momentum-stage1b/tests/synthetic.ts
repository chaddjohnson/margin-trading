// A deterministic synthetic minute market for tests and timing (no market data): regime-switching drift and volatility
// (advances, chop, sharp declines) with 390 one-minute bars per weekday from 2016-01-04 and a closing print.
import { mulberry32 } from '../../study3-vgt-momentum/engine.ts';
import { type Bar, type SessionSpec, datasetOf } from '../../study3-vgt-momentum/tests/fixtures.ts';

export const syntheticMarket = (sessions: number, seed = 7, minutes = 390) => {
  const random = mulberry32(seed);
  const gauss = () => {
    const u = Math.max(1e-12, random());
    const v = random();

    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const specs: SessionSpec[] = [];
  let price = 100;
  let regime = 0;

  for (let s = 0; s < sessions; s++) {
    if (random() < 0.02) {
      regime = Math.floor(random() * 3); // 0 advance, 1 chop, 2 decline
    }

    const drift = [0.0012, 0, -0.0025][regime]!;
    const vol = [0.011, 0.014, 0.025][regime]!;
    const gap = gauss() * vol * 0.4;
    const bars: Bar[] = [];
    let p = price * (1 + gap);
    const step = vol / Math.sqrt(minutes);

    for (let k = 0; k < minutes; k++) {
      const open = p;

      p = p * (1 + drift / minutes + step * gauss());

      const high = Math.max(open, p) * (1 + Math.abs(gauss()) * step * 0.3);
      const low = Math.min(open, p) * (1 - Math.abs(gauss()) * step * 0.3);

      bars.push([open, high, low, p]);
    }

    price = p;
    specs.push({ bars });
  }

  return datasetOf(specs);
};
