// Growth 1.2.0 in the browser: the compact strategy rich select (ARIA combobox + listbox: keyboard, pointer, Escape that
// closes only the list, click-away, Tab, typeahead, focus return, the full descriptions, viewport containment — also on a
// small viewport and in a scrolled dialog), the entry trend filter and persistent eligibility forms (OFF by default, only
// the chosen method's / policy's inputs, the S < L rule, the notes, drafts kept), and (real data) ONE trend-filter +
// latched-eligibility run: latched entries attributed in the trade list, the analysis counts, the applied parameters,
// the decision records in the events, a clone that keeps every value, and a verified, deterministic research bundle.

import { type Page, expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readZip } from '../server/zip.ts';
import { failOnConsoleProblems, hasData } from './console.ts';
import { type Ev, chooseStrategy } from './helpers.ts';

failOnConsoleProblems();

const TREND_FIELDS: Record<string, string[]> = {
  price_change: ['trendChangeLookbackSessions', 'trendChangeMinimumReturnPercent'],
  regression_slope: ['trendSlopeLookbackSessions', 'trendSlopeMinimumPercent'],
  rising_sma: ['trendSmaSessions', 'trendSmaComparisonSessions'],
  higher_highs_lows: ['trendStructureLookbackSessions', 'trendStructureMinimumIncreasePercent'],
  momentum: [
    'trendMomentumShortSessions',
    'trendMomentumLongSessions',
    'trendMomentumMinimumShortReturnPercent',
    'trendMomentumMinimumLongReturnPercent'
  ]
};
const POLICY_FIELDS: Record<string, string[]> = {
  time_limited: [],
  minimum_strength: ['eligibilityMinimumAdvancePercent'],
  maximum_extension: ['eligibilityMaximumExtensionPercent'],
  deterioration: ['eligibilityDeteriorationDropPercent'],
  reset_renew: ['eligibilityResetDropPercent', 'eligibilityRenewalReboundPercent']
};

const openNewTest = async (page: Page) => {
  await page.goto('/');
  await expect(page.getByTestId('run-id')).toBeVisible();
  await page.getByTestId('new-test').click();
  const dialog = page.getByTestId('run-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
};
const activeOption = async (page: Page) => {
  const id = await page.getByTestId('strategy-picker').getAttribute('aria-activedescendant');
  return id ? page.locator(`[id="${id}"]`).getAttribute('data-testid') : null;
};

test('the strategy rich select: keyboard, pointer, Escape, click-away, Tab, typeahead and focus return', async ({ page }) => {
  const dialog = await openNewTest(page);
  const combo = dialog.getByRole('combobox', { name: 'Strategy to test' });
  const list = page.getByTestId('strategy-listbox');
  await expect(dialog.getByRole('radio')).toHaveCount(0); // no stacked radio cards any more
  await expect(combo).toHaveAttribute('aria-expanded', 'false');
  await expect(combo).toHaveAttribute('aria-haspopup', 'listbox');
  await expect(combo).toHaveAttribute('data-value', 'rise-from-recent-low');
  await expect(list).toBeHidden();
  // the closed row: title, version, badge and a one-line subtitle; the details region has the full description
  await expect(combo).toContainText('Rise from recent low (entry signal)');
  await expect(combo).toContainText('v1.0.0');
  await expect(combo).toContainText('SIGNAL-ONLY');
  await expect(dialog.getByTestId('strategy-details')).toContainText('No exits, no positions, no P&L.');
  const closedHeight = (await combo.boundingBox())!.height;
  expect(closedHeight).toBeLessThan(80);

  // keyboard: ↓ opens with the selected option active, ↓ moves, Enter selects and keeps the focus
  await combo.focus();
  await page.keyboard.press('ArrowDown');
  await expect(combo).toHaveAttribute('aria-expanded', 'true');
  await expect(list).toBeVisible();
  await expect(list.getByRole('option')).toHaveCount(2);
  expect(await activeOption(page)).toBe('strategy-option-rise-from-recent-low');
  await expect(list.getByRole('option', { selected: true })).toHaveAttribute('data-testid', 'strategy-option-rise-from-recent-low');
  await page.keyboard.press('ArrowDown');
  expect(await activeOption(page)).toBe('strategy-option-rise-from-recent-low-trading');
  await page.keyboard.press('Enter');
  await expect(list).toBeHidden();
  await expect(combo).toHaveAttribute('data-value', 'rise-from-recent-low-trading');
  await expect(combo).toBeFocused();
  await expect(combo).toContainText('Growth');
  await expect(combo).toContainText('v1.3.0');
  await expect(dialog.getByTestId('group-trend')).toBeVisible(); // the form follows the selected strategy
  await expect(dialog.getByTestId('strategy-details')).toContainText('persistent entry eligibility');

  // Escape closes the list only: no change, the modal stays open
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  expect(await activeOption(page)).toBe('strategy-option-rise-from-recent-low');
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(combo).toHaveAttribute('data-value', 'rise-from-recent-low-trading');
  await expect(dialog).toBeVisible();
  await expect(combo).toBeFocused();

  // typeahead: "r" jumps to the next title starting with r and opens the list; Space selects
  await page.keyboard.press('r');
  await expect(list).toBeVisible();
  expect(await activeOption(page)).toBe('strategy-option-rise-from-recent-low');
  await page.keyboard.press(' ');
  await expect(combo).toHaveAttribute('data-value', 'rise-from-recent-low');
  await page.keyboard.press('g');
  expect(await activeOption(page)).toBe('strategy-option-rise-from-recent-low-trading');
  await page.keyboard.press('Tab'); // Tab closes without a change
  await expect(list).toBeHidden();
  await expect(combo).toHaveAttribute('data-value', 'rise-from-recent-low');

  // pointer: click opens; every option shows its FULL description; a click selects; a click outside closes
  await combo.click();
  await expect(list).toBeVisible();
  await expect(page.getByTestId('strategy-option-rise-from-recent-low-trading')).toContainText('Re-entry needs only a fresh signal');
  await expect(page.getByTestId('strategy-option-rise-from-recent-low')).toContainText('It rearms only after the advance falls back below X%');
  const box = (await list.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  expect(box.height).toBeLessThanOrEqual(421);
  await page.getByTestId('strategy-option-rise-from-recent-low-trading').click();
  await expect(combo).toHaveAttribute('data-value', 'rise-from-recent-low-trading');
  await expect(combo).toBeFocused();
  await combo.click();
  await expect(list).toBeVisible();
  await dialog.getByTestId('run-title').click();
  await expect(list).toBeHidden();
  await expect(combo).toHaveAttribute('data-value', 'rise-from-recent-low-trading');
  // the modal's own Escape still closes the modal when the list is closed
  await combo.focus();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('small viewport and a scrolled dialog: the popup stays in view, no horizontal overflow, selection works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto('/');
  await expect(page.getByTestId('run-id')).toBeVisible();
  // the run view behind the modal is a desktop layout; the modal and its popup must not add any horizontal overflow
  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const dialog = await openNewTest(page);
  const combo = dialog.getByRole('combobox', { name: 'Strategy to test' });
  const list = page.getByTestId('strategy-listbox');
  await combo.click();
  await expect(list).toBeVisible();
  const inView = async () => {
    const b = (await list.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(640);
    return b;
  };
  const before = await inView();
  // the list scrolls internally when it is taller than the room it has
  const scrollable = await list.evaluate((el) => el.scrollHeight > el.clientHeight);
  if (scrollable) {
    await list.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(page.getByTestId('strategy-option-rise-from-recent-low-trading')).toBeInViewport();
  }
  // scrolling the dialog moves the popup with its combobox
  await dialog.evaluate((d) => (d.scrollTop = 24));
  await expect.poll(async () => Math.round((await list.boundingBox())!.y)).toBeLessThan(Math.round(before.y));
  await inView();
  await page.getByTestId('strategy-option-rise-from-recent-low-trading').click();
  await expect(combo).toHaveAttribute('data-value', 'rise-from-recent-low-trading');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(pageOverflow);
  expect(await dialog.evaluate((d) => d.scrollWidth <= d.clientWidth + 1)).toBe(true); // the modal itself: no sideways scroll
  const d = (await dialog.boundingBox())!;
  expect(d.x).toBeGreaterThanOrEqual(0);
  expect(d.x + d.width).toBeLessThanOrEqual(390);
});

test('the entry trend filter and persistent eligibility: OFF by default, only the chosen inputs, rules and notes', async ({ page }) => {
  const dialog = await openNewTest(page);
  await chooseStrategy(page, 'rise-from-recent-low-trading');
  const trend = page.getByTestId('param-trendFilterEnabled');
  const eligibility = page.getByTestId('param-eligibilityEnabled');
  await expect(trend).not.toBeChecked();
  await expect(eligibility).not.toBeChecked();
  for (const k of ['trendMethod', 'eligibilityPolicy', 'eligibilityMaxAgeSessions', ...Object.values(TREND_FIELDS).flat(), ...Object.values(POLICY_FIELDS).flat()])
    await expect(page.getByTestId(`param-${k}`)).toHaveCount(0);
  await expect(dialog.getByTestId('group-trend')).toContainText('An ADDITIONAL gate on every Growth entry decision'); // 1.3.0: relabelled, same inputs

  await trend.check();
  await expect(page.getByTestId('param-trendMethod')).toHaveValue('price_change');
  await expect(page.getByTestId('trend-note')).toContainText('no later entry is made');
  for (const [method, keys] of Object.entries(TREND_FIELDS)) {
    await page.getByTestId('param-trendMethod').selectOption(method);
    for (const [other, otherKeys] of Object.entries(TREND_FIELDS))
      for (const k of otherKeys) await expect(page.getByTestId(`param-${k}`)).toHaveCount(other === method ? 1 : 0);
    expect(keys.length).toBeGreaterThan(0);
  }
  // the momentum rule 0 < S < L, in the form (and on the server)
  await page.getByTestId('param-trendMomentumShortSessions').fill('60');
  await expect(page.getByTestId('cross-errors')).toContainText('short lookback S must be below the long lookback L');
  await expect(page.getByTestId('run-submit')).toBeDisabled();
  await page.getByTestId('param-trendMomentumShortSessions').fill('5');
  await expect(page.getByTestId('cross-errors')).toHaveCount(0);
  await expect(dialog.getByTestId('group-trend')).toContainText('trading sessions');

  await eligibility.check();
  await expect(page.getByTestId('param-eligibilityPolicy')).toHaveValue('time_limited');
  await expect(page.getByTestId('param-eligibilityMaxAgeSessions')).toHaveValue('10');
  await expect(page.getByTestId('eligibility-note')).toContainText('Armed opportunity');
  await expect(page.getByTestId('trend-note')).toHaveCount(0);
  for (const [policy] of Object.entries(POLICY_FIELDS)) {
    await page.getByTestId('param-eligibilityPolicy').selectOption(policy);
    await expect(page.getByTestId('param-eligibilityMaxAgeSessions')).toHaveCount(1); // every policy is bounded
    for (const [other, otherKeys] of Object.entries(POLICY_FIELDS))
      for (const k of otherKeys) await expect(page.getByTestId(`param-${k}`)).toHaveCount(other === policy ? 1 : 0);
  }
  // a draft survives switching policies; a bound is validated
  await page.getByTestId('param-eligibilityPolicy').selectOption('minimum_strength');
  await page.getByTestId('param-eligibilityMinimumAdvancePercent').fill('4');
  await page.getByTestId('param-eligibilityPolicy').selectOption('deterioration');
  await page.getByTestId('param-eligibilityPolicy').selectOption('minimum_strength');
  await expect(page.getByTestId('param-eligibilityMinimumAdvancePercent')).toHaveValue('4');
  await page.getByTestId('param-eligibilityMaxAgeSessions').fill('0');
  await expect(dialog).toContainText('Maximum opportunity age (W): must be between 1 and 120');
  await expect(page.getByTestId('run-submit')).toBeDisabled();
  await page.getByTestId('param-eligibilityMaxAgeSessions').fill('10');
  await expect(page.getByTestId('run-submit')).toBeEnabled();
  // switching the trend filter off hides its inputs and keeps eligibility as it is
  await trend.uncheck();
  await expect(page.getByTestId('param-trendMethod')).toHaveCount(0);
  await expect(page.getByTestId('param-eligibilityPolicy')).toHaveValue('minimum_strength');
});

test('(real data) one trend-filter + latched-eligibility run: latched entries, counts, parameters, records, clone, bundle', async ({ page }) => {
  test.skip(!hasData, 'needs the local market data');
  await page.goto('/');
  await expect(page.getByTestId('run-id')).toBeVisible();
  const before = (await page.getByTestId('run-id').innerText()).trim();
  await page.getByTestId('new-test').click();
  await chooseStrategy(page, 'rise-from-recent-low-trading');
  await page.getByTestId('param-trendFilterEnabled').check();
  await page.getByTestId('param-eligibilityEnabled').check();
  await page.getByTestId('run-from').fill('2016-01-04');
  await page.getByTestId('run-to').fill('2023-12-29');
  await page.getByTestId('run-title').fill('e2e entry gates VGT 2016–2023');
  await page.getByTestId('run-submit').click();
  await expect(page.getByTestId('run-id')).not.toHaveText(before);
  await expect(page.getByTestId('run-status')).toHaveText('completed', { timeout: 120_000 });
  const id = (await page.getByTestId('run-id').innerText()).trim();
  await expect(page.getByTestId('strategy-version')).toHaveText('Growth v1.3.0');

  // trades: latched entries are attributed; the analysis has the gate counts
  const table = page.getByTestId('trade-table-A');
  await expect(table.getByTestId('trade-origin').filter({ hasText: /base Growth · latched O-\d+/ }).first()).toBeVisible();
  await expect(page.getByTestId('metric-opportunities')).toContainText('consumed');
  await expect(page.getByTestId('metric-gate-signals')).toBeVisible();
  await expect(page.getByTestId('metric-trend')).toContainText('base_signal: trend_veto');
  const params = page.getByTestId('parameters');
  await expect(params).toContainText('A — N-session price change (price_change)');
  await expect(params).toContainText('1 — Time-limited opportunity (time_limited)');
  await expect(params).toContainText('Entry trend filter');
  await expect(params).toContainText('Persistent entry eligibility');

  // the records: a deferred raw crossing names its opportunity; its latched decision opened a trade that fills after it
  const events = ((await (await page.request.get(`/api/runs/${id}/events?symbol=VGT`)).json()) as { events: Ev[] }).events;
  const deferred = events.find((e) => e.kind === 'rejected_signal' && e.meta.disposition === 'deferred')!;
  expect(deferred.meta.opportunity).toMatch(/^O-\d+$/);
  const latched = events.filter((e) => e.id.includes(':latched:') && e.tradeId);
  expect(latched.length).toBeGreaterThan(0);
  const entry = events.find((e) => e.kind === 'executed_entry' && e.tradeId === latched[0]!.tradeId)!;
  expect(entry.meta.entrySource).toBe('latched:rise_from_recent_low');
  expect(Date.parse(entry.t)).toBeGreaterThan(Date.parse(latched[0]!.t));
  expect(entry.values.find((v) => v.key === 'ageSessionsAtDecision')!.value).toBeGreaterThan(0);
  expect(new Set(events.map((e) => e.id)).size).toBe(events.length);

  // clone: every value kept; a changed policy makes a new variation and runs
  await page.getByTestId('clone-run').click();
  await expect(page.getByTestId('strategy-picker')).toHaveAttribute('data-value', 'rise-from-recent-low-trading');
  await expect(page.getByTestId('param-trendFilterEnabled')).toBeChecked();
  await expect(page.getByTestId('param-trendMethod')).toHaveValue('price_change');
  await expect(page.getByTestId('param-eligibilityEnabled')).toBeChecked();
  await expect(page.getByTestId('param-eligibilityPolicy')).toHaveValue('time_limited');
  await page.getByTestId('param-eligibilityPolicy').selectOption('maximum_extension');
  await page.getByTestId('run-title').fill('e2e entry gates VGT extension');
  await page.getByTestId('run-submit').click();
  await expect(page.getByTestId('run-id')).not.toHaveText(id);
  await expect(page.getByTestId('run-status')).toHaveText('completed', { timeout: 120_000 });
  await expect(page.getByTestId('parameters')).toContainText('3 — Maximum price extension (maximum_extension)');
  const second = (await page.getByTestId('run-id').innerText()).trim();
  const variations = await Promise.all(
    [id, second].map(async (r) => ((await (await page.request.get(`/api/runs/${r}`)).json()) as { variation: { id: string } }).variation.id)
  );
  expect(variations[0]).not.toBe(variations[1]);

  // the research bundle of the first run: verified, deterministic, with the gate records
  const bundle = async () => {
    const r = await page.request.get(`/api/runs/${id}/export`);
    expect(r.status()).toBe(200);
    return Buffer.from(await r.body());
  };
  const a = await bundle();
  expect(createHash('sha256').update(a).digest('hex')).toBe(createHash('sha256').update(await bundle()).digest('hex'));
  const zip = readZip(a);
  const manifest = JSON.parse(zip.get('manifest.json')!.toString()) as { files: Record<string, { sha256: string }> };
  for (const [name, m] of Object.entries(manifest.files))
    expect(createHash('sha256').update(zip.get(name)!).digest('hex'), name).toBe(m.sha256);
  expect(zip.get('entry-decisions.csv')!.toString()).toContain('latched:rise_from_recent_low');
  expect(zip.get('opportunities.csv')!.toString()).toContain(',consumed,');
  expect(zip.get('entry-gates.md')!.toString()).toContain('Eligibility (time_limited)');
  expect(zip.get('trades.csv')!.toString()).toContain('latched:rise_from_recent_low');
  // the UI download is the same bundle
  const download = page.waitForEvent('download');
  await page.goto(`/#/run/${id}`);
  await expect(page.getByTestId('run-id')).toHaveText(id);
  await page.getByTestId('export-bundle').click();
  const file = await download;
  const path = join(mkdtempSync(join(tmpdir(), 'e2e-gates-bundle-')), file.suggestedFilename());
  await file.saveAs(path);
  expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(createHash('sha256').update(a).digest('hex'));
});
