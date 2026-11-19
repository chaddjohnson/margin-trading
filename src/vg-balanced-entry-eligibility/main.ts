// npm run vg-eligibility -- <command> (PROTOCOL.md §11; RUN_COMMANDS.md lists every command with its arguments).
// Run from the repository root (the engine and the Study 8 resolver read repository-relative files at import time).
import { commands } from './commands.ts';

const [command = 'help', ...args] = process.argv.slice(2);
const handler = commands[command];

if (!handler) {
  console.error(`unknown command ${command}; commands: ${Object.keys(commands).join(', ')}`);
  process.exit(2);
}

try {
  await handler(args);
} catch (error) {
  console.error((error as Error).stack ?? error);
  process.exit(1);
}
