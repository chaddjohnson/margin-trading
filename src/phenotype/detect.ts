// Whether a command line asks for a phenotype run (kept free of imports so src/app.ts can load it for every command).
export const usesPhenotype = (args: readonly string[]) => args.some((arg) => /^--phenotype(-file)?(=|$)/.test(arg));
