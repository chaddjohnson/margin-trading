// Strategy Lab acceptance walkthrough (brief §10): real single runs from the browser, saved runs with bookmarks and
// notes, the imported vg-balanced entries/exits with strict per-symbol filtering, Eastern timestamps, the crosshair, the
// sidebar layout bounds, newest-first ordering, and the absence of any optimisation control.

import { type Page, expect, test } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..', '..', '..');
const hasData = existsSync(join(REPO, 'data/VGT/data.csv'));
const importsDir = join(REPO, 'state/strategy-lab/imports/study8');
const study8 = existsSync(importsDir)
  ? readdirSync(importsDir)
      .filter((d) => d.endsWith('-s8-vg-balanced'))
      .sort()
      .at(-1)
  : undefined;

let problems: string[] = [];
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

async function runIdByTitle(page: Page, q: string): Promise<string> {
  const runs = (await (await page.request.get(`/api/runs?q=${encodeURIComponent(q)}`)).json()) as { id: string }[];
  expect(runs.length).toBeGreaterThan(0);
  return runs[0]!.id;
}

const markerSymbols = (page: Page) =>
  page.locator('button.marker').evaluateAll((bs) => [...new Set(bs.map((b) => (b as HTMLElement).dataset.symbol))]);
const rowSymbols = (page: Page) =>
  page
    .locator('[data-testid="event-table"] tbody tr')
    .evaluateAll((rs) => [...new Set(rs.map((r) => (r as HTMLElement).dataset.symbol))]);

test('the app is Strategy Lab, with no optimisation or sweep control anywhere', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Strategy Lab');
  await expect(page.getByRole('heading', { name: 'Strategy Lab' })).toBeVisible();
  await expect(page.getByTestId('run-header')).toBeVisible();
  await expect(page.getByRole('button', { name: /optimi[sz]|sweep|grid search/i })).toHaveCount(0);
  await page.getByTestId('new-test').click();
  await expect(page.getByTestId('run-dialog')).toContainText('exactly one configuration');
  await expect(page.getByTestId('run-dialog').getByRole('button', { name: /optimi[sz]|sweep/i })).toHaveCount(0);
});

test('the sidebar ends at the bottom of the viewport with and without the banner, and its list scrolls inside', async ({
  page
}) => {
  for (const size of [
    { width: 1600, height: 1000 },
    { width: 1280, height: 640 },
    { width: 1000, height: 700 }
  ]) {
    await page.setViewportSize(size);
    const demo = await runIdByTitle(page, 'synthetic demo');
    for (const hash of [`#/run/${demo}`, '']) {
      await page.goto(`/${hash}`);
      await expect(page.getByTestId('run-header')).toBeVisible();
      if (hash) await expect(page.getByTestId('demo-banner')).toBeVisible();
      const box = await page.getByTestId('sidebar').boundingBox();
      expect(box!.y + box!.height, `sidebar bottom at ${size.width}×${size.height}`).toBeLessThanOrEqual(
        size.height + 0.5
      );
      const list = page.getByTestId('item-list');
      const [scrollH, clientH, listBottom] = await list.evaluate((el) => [
        el.scrollHeight,
        el.clientHeight,
        el.getBoundingClientRect().bottom
      ]);
      expect(listBottom).toBeLessThanOrEqual(size.height);
      if (scrollH > clientH) {
        await list.evaluate((el) => el.scrollTo(0, el.scrollHeight));
        expect(await page.evaluate(() => window.scrollY)).toBe(0); // the page itself did not scroll
      }
    }
  }
});

test('recent runs are newest first; variations by latest result, never-run last (with the explanation)', async ({
  page
}) => {
  await page.goto('/');
  const runs = (await (await page.request.get('/api/runs')).json()) as {
    completedAt: string | null;
    createdAt: string;
  }[];
  const times = runs.map((r) => r.completedAt ?? r.createdAt);
  expect(times).toEqual([...times].sort().reverse());
  const vars = (await (await page.request.get('/api/variations')).json()) as { latestResultAt: string | null }[];
  const withResult = vars.filter((v) => v.latestResultAt).map((v) => v.latestResultAt!);
  expect(withResult).toEqual([...withResult].sort().reverse());
  const firstNeverRun = vars.findIndex((v) => !v.latestResultAt);
  if (firstNeverRun >= 0) expect(vars.slice(firstNeverRun).every((v) => !v.latestResultAt)).toBe(true);
  await page.getByTestId('tab-variations').click();
  await expect(page.getByTestId('sidebar')).toContainText('Variations without a completed run come last');
});

test('bookmarks: revealed on hover and keyboard focus, persistent, filterable', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('[data-testid="item-list"] li.item').first();
  const star = first.locator('button.star');
  const runId = await first.getAttribute('data-run-id');
  await page.mouse.move(5, 5);
  expect(Number(await star.evaluate((s) => getComputedStyle(s).opacity))).toBe(0);
  await first.hover();
  await expect.poll(async () => Number(await star.evaluate((s) => getComputedStyle(s).opacity))).toBe(1);
  await page.mouse.move(5, 5);
  await star.focus();
  await expect.poll(async () => Number(await star.evaluate((s) => getComputedStyle(s).opacity))).toBe(1);
  await page.keyboard.press('Enter');
  await expect(page.locator(`li[data-run-id="${runId}"] button.star`)).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(5, 5);
  await page.reload();
  const kept = page.locator(`li[data-run-id="${runId}"] button.star`);
  await expect(kept).toHaveAttribute('aria-pressed', 'true');
  expect(Number(await kept.evaluate((s) => getComputedStyle(s).opacity))).toBe(1); // visible without hover
  await page.getByTestId('tab-bookmarks').click();
  await expect(page.locator(`[data-testid="item-list"] li[data-run-id="${runId}"]`)).toBeVisible();
  await page.getByTestId('tab-bookmarks').click();
  await page.locator(`li[data-run-id="${runId}"] button.star`).click();
  await expect(page.locator(`[data-testid="item-list"] li[data-run-id="${runId}"]`)).toHaveCount(0);
});

test.describe('real data', () => {
  test.skip(!hasData, 'the git-ignored data/ files are not present');

  test('Run Test from the browser, then 5% → 6% creates a new variation and run; the old run is unchanged; notes persist', async ({
    page
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('run-id')).toBeVisible();
    const previous = (await page.getByTestId('run-id').innerText()).trim();
    await page.getByTestId('new-test').click();
    const dialog = page.getByTestId('run-dialog');
    await page.getByTestId('param-advanceFromRecentLowPercent').fill('-1');
    await expect(dialog.getByRole('alert').or(dialog.locator('.form-error')).first()).toBeVisible();
    await expect(page.getByTestId('run-submit')).toBeDisabled();
    await page.getByTestId('param-advanceFromRecentLowPercent').fill('5');
    await page.getByTestId('symbol-GDX').check();
    await page.getByTestId('run-from').fill('2021-01-04');
    await page.getByTestId('run-to').fill('2021-12-31');
    await page.getByTestId('run-title').fill('e2e five percent');
    await page.getByTestId('run-submit').click();
    await expect(page.getByTestId('run-id')).not.toHaveText(previous);
    const firstId = (await page.getByTestId('run-id').innerText()).trim();
    await expect(page.getByTestId('run-status')).toHaveText('completed', { timeout: 90_000 });
    await expect(page.locator('button.marker').first()).toBeVisible();
    const firstCount = await page.locator('button.marker').count();
    expect(await markerSymbols(page)).toEqual(['VGT']);

    await page.getByTestId('clone-run').click();
    await expect(page.getByTestId('param-advanceFromRecentLowPercent')).toHaveValue('5');
    await page.getByTestId('param-advanceFromRecentLowPercent').fill('6');
    await page.getByTestId('run-title').fill('e2e six percent');
    await page.getByTestId('run-submit').click();
    await expect(page.getByTestId('run-id')).not.toHaveText(firstId);
    const secondId = (await page.getByTestId('run-id').innerText()).trim();
    await expect(page.getByTestId('run-status')).toHaveText('completed', { timeout: 90_000 });
    const a = await (await page.request.get(`/api/runs/${firstId}`)).json();
    const b = await (await page.request.get(`/api/runs/${secondId}`)).json();
    expect(b.variation.id).not.toBe(a.variation.id);
    expect(a.params.find((p: { key: string }) => p.key === 'advanceFromRecentLowPercent').value).toBe(5);
    expect(b.params.find((p: { key: string }) => p.key === 'advanceFromRecentLowPercent').value).toBe(6);
    await expect(page.getByTestId('parameters')).toContainText('6%');

    await page.getByTestId('note-input-run').fill('**Observation:** fewer signals at 6%');
    await page.getByTestId('note-add-run').click();
    await expect(page.getByTestId('notes-run')).toContainText('Observation:');

    // Refresh: the saved run, its events and its note come back from SQLite.
    await page.goto(`/#/run/${firstId}`);
    await page.reload();
    await expect(page.locator('button.marker').first()).toBeVisible();
    expect(await page.locator('button.marker').count()).toBe(firstCount);
    await page.goto(`/#/run/${secondId}`);
    await expect(page.getByTestId('notes-run')).toContainText('fewer signals at 6%');
    await expect(page.locator(`li[data-run-id="${secondId}"] .item-note`)).toContainText('Observation');
  });

  test('crosshair follows the pointer with an Eastern-time readout', async ({ page }) => {
    const id = await runIdByTitle(page, 'e2e five percent');
    await page.goto(`/#/run/${id}`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    const host = (await page.locator('.chart-host').boundingBox())!;
    await page.mouse.move(host.x + host.width * 0.4, host.y + host.height * 0.4);
    await expect(page.getByTestId('crosshair')).toBeVisible();
    await expect(page.getByTestId('chart-readout')).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T · \d/);
    const x1 = (await page.getByTestId('crosshair').boundingBox())!.x;
    await page.mouse.move(host.x + host.width * 0.6, host.y + host.height * 0.4);
    await expect.poll(async () => (await page.getByTestId('crosshair').boundingBox())!.x).toBeGreaterThan(x1);
    await page.mouse.move(5, 5);
    await expect(page.getByTestId('crosshair')).toBeHidden();
  });
});

test.describe('vg-balanced (Study 8 #2) entries and exits', () => {
  test.skip(!hasData || !study8, 'no local data or Study 8 runner output');

  const lots = () =>
    JSON.parse(readFileSync(join(importsDir, study8!, 'lots.json'), 'utf8')).lots as {
      symbol: string;
      status: string;
      entryTimeUtc: string;
      exitTimeUtc: string;
      entryFillPrice: number;
    }[];

  test('VGT shows only VGT, GDX only GDX — markers, table, tooltips, analysis — and counts match the source', async ({
    page
  }) => {
    const id = await runIdByTitle(page, 'vg-balanced');
    const src = lots();
    const refused = readFileSync(join(importsDir, study8!, 'signals.csv'), 'utf8')
      .split('\n')
      .filter((l) => l.includes(',refused,'));
    for (const sym of ['VGT', 'GDX']) {
      await page.goto(`/#/run/${id}?symbol=${sym}`);
      await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
      expect(await markerSymbols(page)).toEqual([sym]);
      await page.getByTestId('event-table').getByText('All dates', { exact: true }).click();
      expect(await rowSymbols(page)).toEqual([sym]);
      const entries = src.filter((l) => l.symbol === sym).length;
      const exits = src.filter((l) => l.symbol === sym && l.status === 'closed').length;
      const rejected = refused.filter((l) => l.startsWith(`${sym},`)).length;
      await expect(page.getByTestId('count-A-executed_entry')).toHaveText(String(entries));
      await expect(page.getByTestId('count-A-executed_exit')).toHaveText(String(exits));
      await expect(page.getByTestId('count-A-rejected_signal')).toHaveText(String(rejected));
      await expect(page.getByTestId('analysis-symbol-counts')).toHaveText(`${entries} · ${exits} · ${rejected}`);
      await expect(page.locator('[data-testid="event-table"] tbody tr')).toHaveCount(entries + exits + rejected);
      // Hover by coordinates: neighbouring markers overlap at full zoom (the tooltip then lists all of them). The
      // table click above may have scrolled the chart away (the Trades card sits above the table): bring it back.
      await page.getByTestId('price-chart').scrollIntoViewIfNeeded();
      const fb = (await page.locator('button.marker').first().boundingBox())!;
      await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
      await expect(page.getByTestId('marker-tooltip')).toBeVisible();
      const tipSymbols = await page
        .getByTestId('marker-tooltip')
        .locator('.tt-item')
        .evaluateAll((xs) => xs.map((x) => (x as HTMLElement).dataset.symbol));
      expect(new Set(tipSymbols)).toEqual(new Set([sym]));
      // Toggling a category hides those markers and rows only.
      await page.getByTestId('kind-executed_exit').uncheck();
      expect(await page.locator('button.marker[data-kind="executed_exit"]').count()).toBe(0);
      await expect(page.locator('[data-testid="event-table"] tbody tr[data-kind="executed_exit"]')).toHaveCount(0);
      await page.getByTestId('kind-executed_exit').check();
    }
  });

  test('entry times match the source to the minute, labelled EST/EDT, and stay on their price after zooming', async ({
    page
  }) => {
    const id = await runIdByTitle(page, 'vg-balanced');
    const vgt = lots().filter((l) => l.symbol === 'VGT');
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    await page.getByTestId('event-table').getByText('All dates', { exact: true }).click();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short'
    });
    const et = (iso: string) => {
      const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
      return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}`;
    };
    const rows = page.locator('[data-testid="event-table"] tbody tr[data-kind="executed_entry"]');
    await expect(rows).toHaveCount(vgt.length);
    for (const [i, l] of vgt.entries()) await expect(rows.nth(i).locator('td').nth(2)).toHaveText(et(l.entryTimeUtc));
    expect(
      vgt.some((l) => et(l.entryTimeUtc).endsWith('EST')) && vgt.some((l) => et(l.entryTimeUtc).endsWith('EDT'))
    ).toBe(true);

    // Select an entry from the table, zoom to it (minute detail is loaded), and check the marker sits on its time/price.
    const lot = vgt[2]!;
    await rows.nth(2).click();
    await expect(page.getByTestId('detail-time')).toHaveText(et(lot.entryTimeUtc));
    await expect(page.getByTestId('detail-price')).toContainText(lot.entryFillPrice.toFixed(2));
    await page.getByRole('button', { name: 'Zoom here' }).click();
    await page.getByRole('button', { name: '1W', exact: true }).click();
    await page.waitForTimeout(1200); // detail fetch (debounced) and redraw
    const marker = page.locator('button.marker.is-selected');
    await expect(marker).toBeVisible();
    const mb = (await marker.boundingBox())!;
    await page.mouse.move(mb.x + mb.width / 2, mb.y - 4);
    await expect(page.getByTestId('chart-readout')).toBeVisible();
    const readout = await page.getByTestId('chart-readout').innerText();
    const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}) (E[SD]T) · ([\d.]+)$/.exec(readout)!;
    expect(m, readout).not.toBeNull();
    const want = et(lot.entryTimeUtc);
    expect(m[1]).toBe(want.slice(0, 10));
    const minutes = (h: string, mm: string) => Number(h) * 60 + Number(mm);
    expect(Math.abs(minutes(m[2]!, m[3]!) - minutes(want.slice(11, 13), want.slice(14, 16)))).toBeLessThanOrEqual(2);
    expect(Math.abs(Number(m[5]) / lot.entryFillPrice - 1)).toBeLessThan(0.01);
  });

  test('symbol switch clears the selection, keeps a valid zoom; comparison never leaks the other symbol', async ({
    page
  }) => {
    test.skip(!hasData);
    const id = await runIdByTitle(page, 'vg-balanced');
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    await page.locator('button.marker').first().click();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', /.+/);
    await page.getByRole('button', { name: '3Y', exact: true }).click();
    await page.waitForTimeout(600);
    const before = await page.getByTestId('price-chart').getAttribute('data-view-from');
    await page.getByTestId('symbol-tab-GDX').click();
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('event-detail')).not.toHaveAttribute('data-event-id', /.+/);
    expect(await page.getByTestId('price-chart').getAttribute('data-view-from')).toBe(before);
    // Compare with a manual run that has GDX: only GDX events of both runs appear.
    const options = await page.getByTestId('compare-select').locator('option').allTextContents();
    if (options.length > 1) {
      await page.getByTestId('compare-select').selectOption({ index: 1 });
      await page.waitForTimeout(1200);
      expect(await markerSymbols(page)).toEqual(['GDX']);
      expect(await rowSymbols(page)).toEqual(['GDX']);
    }
  });
});
