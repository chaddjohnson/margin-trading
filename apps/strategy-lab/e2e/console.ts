// Fails a test on any browser console error or warning (shared by the Task 10 specs).
import { type Page, expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const REPO = join(import.meta.dirname, '..', '..', '..');
export const hasData = ['VGT', 'GDX'].every((s) => existsSync(join(REPO, `data/${s}/data.csv`)));

export function failOnConsoleProblems() {
  let problems: string[] = [];
  test.beforeEach(async ({ page }) => {
    problems = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  });
  test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));
}

export const waitCompleted = async (page: Page, id: string) =>
  expect
    .poll(async () => ((await (await page.request.get(`/api/runs/${id}`)).json()) as { status: string }).status, {
      timeout: 120_000
    })
    .toBe('completed');
