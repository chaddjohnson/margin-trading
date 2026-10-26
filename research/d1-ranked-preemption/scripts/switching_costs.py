# Frictions and interest on the two legs of every executed switch of the final window's B/C/D picks (5 bps,
# training data), from the CLI's engine exports. Reads only evaluations/ranked-preemption/; writes nothing.
# Prerequisite (read-only, training data only), for each id below:
#   npm run ranked-preemption -- preemptions <id>
# Usage (repository root): python3 -I research/d1-ranked-preemption/scripts/switching_costs.py
import json

BASE = 'evaluations/ranked-preemption'
IDS = ['RP-final-B-R1', 'RP-final-B-R2', 'RP-final-C-R1', 'RP-final-C-R2', 'RP-final-D-R1', 'RP-final-D-R2']

money = lambda x: ('−$' if x < 0 else '$') + f'{abs(x):,.0f}'
print('| Configuration | Executed | Sale exit friction | Preempted lots: interest through the sale | Preempted lots: net | '
      'Replacement lots: friction | Replacement lots: interest | Replacement lots: net |')
print('|---|---:|---:|---:|---:|---:|---:|---:|')
for id in IDS:
    out = f'{BASE}/{id}-fixed-5bps-to-2023-12-29'
    records = json.load(open(f'{out}/preemptions.json'))['preemptions']
    lots = {row['lot']: row for row in json.load(open(f'{out}/trades.json'))['rows']}
    executed = [r for r in records if r['outcome'] == 'executed']
    replacements = [lots[r['replacementLotId']] for r in executed]
    print(f"| {id.replace('RP-final-', '')} | {len(executed)} | {money(sum(r['exitFriction'] for r in executed))} | "
          f"{money(sum(r['executionInterest'] for r in executed))} | {money(sum(r['executionNet'] for r in executed))} | "
          f"{money(sum(l['friction'] for l in replacements))} | {money(sum(l['interest'] for l in replacements))} | "
          f"{money(sum(l['net'] for l in replacements))} |")
