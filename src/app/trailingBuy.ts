// The trailing-buy entry study (research/trailing-buy-entry). Run with
// `node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts trailingBuy <command>`;
// see the study README for the commands.
import { main } from '../trailing-buy/cli.ts';

export default async (command?: string, ...args: string[]) => {
  await main(command, ...args);
};
