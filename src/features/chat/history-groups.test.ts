import { describe, expect, it } from 'vitest';
import type { HistoryConversation } from '@/api/types';
import { groupByDay } from './history-groups';

const conversation = (id: string, lastAt: string): HistoryConversation => ({
  conversationId: id,
  title: id,
  startedAt: lastAt,
  lastAt,
  questions: 1,
});

describe('history by day', () => {
  it('groups by the Melbourne day of the latest question, leaving out empty groups', () => {
    // 9 am on 6 Nov in Melbourne.
    const now = Date.parse('2026-11-05T22:00:00Z');
    const groups = groupByDay(
      [
        conversation('this-morning', '2026-11-05T20:00:00Z'),
        conversation('late-last-night', '2026-11-05T12:30:00Z'),
        conversation('last-week', '2026-10-29T01:00:00Z'),
      ],
      now
    );
    expect(groups.map((group) => [group.label, group.items.map((item) => item.title)])).toEqual([
      ['Today', ['this-morning']],
      ['Yesterday', ['late-last-night']],
      ['Earlier', ['last-week']],
    ]);
    expect(
      groupByDay([conversation('old', '2026-10-01T00:00:00Z')], now).map((g) => g.label)
    ).toEqual(['Earlier']);
  });
});
