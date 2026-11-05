// Deleting a saved result in the browser: the run header's actions menu opens a confirmation that shows the run id,
// strategy, symbols and run date with a permanence warning; Cancel is focused and is the default (Enter and Escape
// keep the run); "Delete result" deletes exactly that run (feedback, list and selection updated, its note and bookmark
// gone, the other runs kept); a failed deletion is reported in the dialog and nothing is assumed deleted; a slow
// deletion cannot be sent twice; a comparison with a run deleted elsewhere is dropped. Each test deletes only runs it
// created (real local data for the signal-only runs; skipped without it).

import { type Page, expect, test } from '@playwright/test';

import { hasData, waitCompleted } from './console.ts';

let problems: string[] = [];
let allow: RegExp | null = null;
test.beforeEach(async ({ page }) => {
  problems = [];
  allow = null;
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !(allow && allow.test(m.text()))) problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

const signalRun = async (page: Page, title: string) => {
  const res = await page.request.post('/api/runs', {
    data: {
      strategyKey: 'rise-from-recent-low',
      strategyVersion: '1.0.0',
      params: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 },
      symbols: ['VGT'],
      from: '2023-01-03',
      to: '2023-03-31',
      resolution: '1d',
      title
    }
  });
  expect(res.status()).toBe(201);
  const id = ((await res.json()) as { id: string }).id;
  await waitCompleted(page, id);
  return id;
};
const exists = async (page: Page, id: string) => (await page.request.get(`/api/runs/${id}`)).status() === 200;
const openRun = async (page: Page, id: string, compare?: string) => {
  await page.goto(`/#/run/${id}${compare ? `?compare=${compare}` : ''}`);
  await expect(page.getByTestId('run-id')).toHaveText(id);
};
const openConfirmation = async (page: Page) => {
  await page.getByTestId('run-actions').click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByTestId('run-action-delete').click();
  const dialog = page.getByTestId('delete-run-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe('delete a saved result', () => {
  test.skip(!hasData, 'needs the local market data');

  test('the confirmation shows the run and the warning; Cancel is the default; Enter, Escape and Cancel keep it', async ({ page }) => {
    const id = await signalRun(page, 'e2e delete — kept by cancel');
    await openRun(page, id);
    // the menu closes on Escape without opening anything
    await page.getByTestId('run-actions').click();
    await expect(page.getByTestId('run-action-delete')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    let dialog = await openConfirmation(page);
    await expect(dialog.getByTestId('delete-run-id')).toContainText(id);
    await expect(dialog.getByTestId('delete-run-strategy')).toContainText('Rise from recent low (entry signal)');
    await expect(dialog.getByTestId('delete-run-symbols')).toHaveText('VGT');
    await expect(dialog.getByTestId('delete-run-date')).toContainText(/E[SD]T/);
    await expect(dialog).toContainText('This is permanent and cannot be undone.');
    await expect(dialog.getByTestId('delete-run-cancel')).toBeFocused();
    await expect(dialog.getByTestId('delete-run-confirm')).toHaveClass(/btn-danger/);
    await expect(dialog.getByTestId('delete-run-confirm')).toHaveAttribute('type', 'button');
    await page.keyboard.press('Enter'); // the focused default is Cancel
    await expect(dialog).toHaveCount(0);
    expect(await exists(page, id)).toBe(true);
    dialog = await openConfirmation(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    dialog = await openConfirmation(page);
    await dialog.getByTestId('delete-run-cancel').click();
    await expect(dialog).toHaveCount(0);
    expect(await exists(page, id)).toBe(true);
    await expect(page.getByTestId('run-id')).toHaveText(id);
    // clean up through the same route the UI uses
    expect((await page.request.delete(`/api/runs/${id}`, { data: { confirm: id } })).status()).toBe(200);
  });

  test('Delete result deletes exactly that run: feedback, list and selection updated, its note and bookmark gone', async ({ page }) => {
    const keep = await signalRun(page, 'e2e delete — other run kept');
    const id = await signalRun(page, 'e2e delete — deleted');
    await page.request.put(`/api/runs/${id}/bookmark`);
    await page.request.post('/api/notes', { data: { targetType: 'run', targetId: id, body: 'note of the deleted run' } });
    await page.request.post('/api/notes', { data: { targetType: 'run', targetId: keep, body: 'note of the kept run' } });
    const before = ((await (await page.request.get('/api/runs?limit=500')).json()) as { id: string }[]).map((r) => r.id);
    await openRun(page, id);
    await expect(page.getByTestId('sidebar')).toContainText(id);
    const dialog = await openConfirmation(page);
    await expect(dialog).toContainText('its 1 note and its bookmark');
    await dialog.getByTestId('delete-run-confirm').click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('app-notice')).toContainText(`Deleted ${id} (Rise from recent low (entry signal), VGT) with 1 note and its bookmark`);
    // the most recent remaining run opens; the list no longer has the deleted one
    await expect(page.getByTestId('run-id')).toHaveText(keep);
    await expect(page).not.toHaveURL(new RegExp(id));
    await expect(page.getByTestId('sidebar')).not.toContainText(id);
    expect(await exists(page, id)).toBe(false);
    const after = ((await (await page.request.get('/api/runs?limit=500')).json()) as { id: string }[]).map((r) => r.id);
    expect(after).toEqual(before.filter((x) => x !== id)); // nothing else removed, nothing renumbered
    const notes = (await (await page.request.get(`/api/notes?targetType=run&targetId=${keep}`)).json()) as { body: string }[];
    expect(notes.map((n) => n.body)).toEqual(['note of the kept run']);
    await page.getByTestId('app-notice').getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.getByTestId('app-notice')).toHaveCount(0);
    expect((await page.request.delete(`/api/runs/${keep}`, { data: { confirm: keep } })).status()).toBe(200);
  });

  test('a failed deletion is reported and nothing is assumed deleted; a slow one cannot be sent twice', async ({ page }) => {
    const id = await signalRun(page, 'e2e delete — failure and duplicate');
    await openRun(page, id);
    let requests = 0;
    await page.route(`**/api/runs/${id}`, async (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      requests++;
      if (requests === 1) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: `${id} was NOT deleted: disk full; nothing was changed` }) });
      await new Promise((r) => setTimeout(r, 800)); // a slow success: the real request after a pause
      return route.fallback();
    });
    allow = /status of 500/; // the simulated failure's own resource error
    const dialog = await openConfirmation(page);
    await dialog.getByTestId('delete-run-confirm').click();
    await expect(dialog.getByTestId('delete-run-error')).toContainText('Not deleted.');
    await expect(dialog.getByTestId('delete-run-error')).toContainText('disk full');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('app-notice')).toHaveCount(0);
    expect(await exists(page, id)).toBe(true);
    // retry: the button disables at once, a second click sends nothing
    await dialog.getByTestId('delete-run-confirm').click();
    await expect(dialog.getByTestId('delete-run-confirm')).toBeDisabled();
    await expect(dialog.getByTestId('delete-run-confirm')).toHaveText('Deleting…');
    await expect(dialog.getByTestId('delete-run-cancel')).toBeDisabled();
    await dialog.getByTestId('delete-run-confirm').click({ force: true });
    await expect(page.getByTestId('app-notice')).toContainText(`Deleted ${id}`);
    expect(requests).toBe(2);
    expect(await exists(page, id)).toBe(false);
  });

  test('a comparison with a run deleted elsewhere is dropped from the view', async ({ page }) => {
    const a = await signalRun(page, 'e2e delete — compare A');
    const b = await signalRun(page, 'e2e delete — compare B');
    await openRun(page, a, b);
    await expect(page).toHaveURL(new RegExp(`compare=${b}`));
    expect((await page.request.delete(`/api/runs/${b}`, { data: { confirm: b } })).status()).toBe(200);
    allow = /status of 404/; // the reload's one request for the deleted comparison run
    await page.reload();
    await expect(page.getByTestId('run-id')).toHaveText(a);
    await expect(page).not.toHaveURL(/compare=/);
    expect((await page.request.delete(`/api/runs/${a}`, { data: { confirm: a } })).status()).toBe(200);
  });
});
