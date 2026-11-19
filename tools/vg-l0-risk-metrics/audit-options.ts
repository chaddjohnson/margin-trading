// The Stage 3 audit's windows, report closes and episodes (PROTOCOL.md §8 S3), shared by the stage runners.
export const auditOptions = {
  windows: { development: [null, '2024-12-31'], '2025–2026 (reset)': ['2024-12-31', '2026-10-30'], full: [null, '2026-10-30'] } as Record<string, [string | null, string]>,
  closes: ['2019-12-31', '2021-12-31', '2023-12-29', '2024-12-31', '2026-10-30'],
  episodes: { 'crash 2020': ['2020-02-19', '2020-04-30'], 'bear 2022': ['2022-01-03', '2022-12-30'], 'year 2025': ['2025-01-02', '2025-12-31'] } as Record<string, [string, string]>
};
