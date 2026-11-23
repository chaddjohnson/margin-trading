// Priority 4's non-official tools dispatcher (`npm run vg-l0ss-tools -- <command> …`, purpose diagnostic):
//   analyze                                     report tables from the sealed records (no evaluation)
//   diagnose --spec <pairs.json> --door D --out <json>   report-only CPU diagnostic replays (diagnose.ts)
//   pairs ablation|selection --cutoff C|decomposition --out <json>   declared pair sets for diagnose (pairs.ts)
const cmd = process.argv[2];

if (cmd === 'analyze') await import('./analyze.ts');
else if (cmd === 'diagnose') await import('./diagnose.ts');
else if (cmd === 'pairs') await import('./pairs.ts');
else {
  console.error('usage: vg-l0ss-tools -- analyze | diagnose --spec <pairs.json> --door D --out <json>');
  process.exit(2);
}
