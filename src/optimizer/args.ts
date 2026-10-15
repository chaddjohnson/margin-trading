// A small `--flag value` / `--switch` argument parser for the optimizer CLI.
export interface ParsedArgs {
  command?: string;
  positional: string[];
  flags: Map<string, string | true>;
}

export const parseArgs = (args: string[]): ParsedArgs => {
  const flags = new Map<string, string | true>();
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;

    if (arg.startsWith('--')) {
      const [name, inline] = arg.slice(2).split('=', 2) as [string, string | undefined];
      const next = args[index + 1];

      if (inline !== undefined) {
        flags.set(name, inline);
      } else if (next !== undefined && !next.startsWith('--')) {
        flags.set(name, next);
        index++;
      } else {
        flags.set(name, true);
      }
    } else {
      positional.push(arg);
    }
  }

  return { command: positional.shift(), positional, flags };
};

export const flagString = (args: ParsedArgs, name: string, fallback?: string) => {
  const value = args.flags.get(name);

  if (value === true) {
    throw new Error(`--${name} needs a value`);
  }

  return value ?? fallback;
};

export const flagNumber = (args: ParsedArgs, name: string, fallback: number) => {
  const value = flagString(args, name);

  if (value === undefined) {
    return fallback;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`--${name} must be a number`);
  }

  return number;
};

export const flagInteger = (args: ParsedArgs, name: string, fallback: number, min = -Infinity, max = Infinity) => {
  const number = flagNumber(args, name, fallback);

  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`--${name} must be an integer from ${min} to ${max}`);
  }

  return number;
};

export const flagBoolean = (args: ParsedArgs, name: string) =>
  args.flags.get(name) === true || args.flags.get(name) === 'true';
