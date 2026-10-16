// The VGT drawdown-regime / entry-risk study (research/vgt-drawdown-entry-risk). Run with
// `node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts drawdownEntry <command>`,
// where the command is golden, dev, final, reports or all.
import { main } from '../drawdown-entry/cli.ts';

export default async (command?: string) => {
  await main(command);
};
