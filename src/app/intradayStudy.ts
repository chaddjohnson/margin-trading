// The VGT intraday-entry / trailing-stop / correction-size study (research/vgt-intraday-study). Run with
// `node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts intradayStudy <command>`,
// where the command is verify-protected, golden-master, run, tables, determinism, manifest or all.
import { main } from '../intraday-study/cli.ts';

export default async (command?: string) => {
  await main(command);
};
