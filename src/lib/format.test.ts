import { describe, expect, it } from 'vitest';
import {
  formatClockSeconds,
  formatCompact,
  formatDateTime,
  formatDuration,
  formatRelative,
  formatUsd,
  formatUtc,
  formatWait,
  initials,
  melbourneDay,
  plural,
  shortId,
} from './format';

describe('format', () => {
  it('writes dollars to the decimals asked for', () => {
    expect(formatUsd(6.9213)).toBe('$6.92');
    expect(formatUsd(0.0213, 4)).toBe('$0.0213');
    expect(formatUsd(1234.5)).toBe('$1,234.50');
  });

  it('shortens token counts past a thousand', () => {
    expect(formatCompact(388)).toBe('388');
    expect(formatCompact(14_820)).toBe('14.8k');
  });

  it('writes durations in the unit that reads best', () => {
    expect(formatDuration(412)).toBe('412 ms');
    expect(formatDuration(6400)).toBe('6.4 s');
    expect(formatDuration(360_000)).toBe('6 min');
  });

  it('says how long until a retry, to the minute', () => {
    expect(formatWait(22_320)).toBe('6 h 12 min');
    expect(formatWait(30)).toBe('1 min');
    expect(formatWait(7200)).toBe('2 h');
  });

  it('shows times in Melbourne, and UTC in full', () => {
    // 03:32 UTC on 5 Nov is 14:32 in Melbourne, in daylight saving.
    expect(formatDateTime('2026-11-05T03:32:05Z')).toBe('5 Nov, 14:32');
    expect(formatClockSeconds('2026-11-05T03:32:05Z')).toBe('14:32:05');
    expect(formatUtc('2026-11-05T03:32:05.123Z')).toBe('2026-11-05 03:32:05 UTC');
  });

  it('puts a time on the Melbourne day it fell on', () => {
    expect(melbourneDay('2026-11-05T13:30:00Z')).toBe('2026-11-06');
    expect(melbourneDay('2026-11-05T12:30:00Z')).toBe('2026-11-05');
  });

  it('says how long ago something was', () => {
    const now = Date.parse('2026-11-05T12:00:00Z');
    expect(formatRelative('2026-11-05T11:59:30Z', now)).toBe('just now');
    expect(formatRelative('2026-11-05T11:48:00Z', now)).toBe('12 min ago');
    expect(formatRelative('2026-11-05T09:00:00Z', now)).toBe('3 h ago');
    expect(formatRelative('2026-11-03T12:00:00Z', now)).toBe('2 d ago');
  });

  it('shortens OrcaSonar IDs and leaves other text alone', () => {
    expect(shortId('c_3f9a00000000000000000000000c21d')).toBe('c_3f9a…c21d');
    expect(shortId('x_51c0f81d9b89a51c0f81d9b89a5b89a')).toBe('x_51c0…b89a');
    expect(shortId('platform:onboarding')).toBe('platform:onboarding');
  });

  it('takes initials from an email', () => {
    expect(initials('a.reader@umccr.org')).toBe('AR');
    expect(initials('spatel@umccr.org')).toBe('SP');
    expect(initials(undefined)).toBe('?');
  });

  it('counts in words', () => {
    expect(plural(1, 'question')).toBe('1 question');
    expect(plural(1200, 'question')).toBe('1,200 questions');
  });
});
