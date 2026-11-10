/** The windows the audit pages offer. OrcaSonar keeps 30 days and a window spans at most 31. */
export const RANGES = ['24h', '7d', '14d', '30d'] as const;
export type Range = (typeof RANGES)[number];

export const DEFAULT_RANGE: Range = '7d';

export const RANGE_LABELS: Record<Range, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '14d': 'Last 14 days',
  '30d': 'Last 30 days',
};

const DAY_MS = 86_400_000;
const RANGE_MS: Record<Range, number> = {
  '24h': DAY_MS,
  '7d': 7 * DAY_MS,
  '14d': 14 * DAY_MS,
  '30d': 30 * DAY_MS,
};

export const isRange = (value: string | null | undefined): value is Range =>
  RANGES.includes(value as Range);

/** A window as the audit API takes it: ISO times in UTC. */
export interface AuditWindow {
  readonly from: string;
  readonly to: string;
}

/** The window a range covers up to `now`. Both ends are fixed, so the window stays the same until it is refreshed. */
export const windowFor = (range: Range, now: number): AuditWindow => ({
  from: new Date(now - RANGE_MS[range]).toISOString(),
  to: new Date(now).toISOString(),
});
