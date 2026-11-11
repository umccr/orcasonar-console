import type { HistoryConversation } from '@/api/types';
import { melbourneDay } from '@/lib/format';

const DAY_MS = 86_400_000;

/** Latest first; times are ISO, which sort as text. */
const byLatest = (a: HistoryConversation, b: HistoryConversation) =>
  a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0;

/**
 * Conversations under Today, Yesterday and Earlier, by the Melbourne day of their latest question, latest first in each.
 * Pages arrive most recently active first, but a later page can hold a conversation that a question saved after the
 * first page made recent, so each group is sorted again.
 */
export const groupByDay = (
  conversations: readonly HistoryConversation[],
  now: number
): { label: string; items: HistoryConversation[] }[] => {
  const today = melbourneDay(now);
  const yesterday = melbourneDay(now - DAY_MS);
  const groups = [
    { label: 'Today', items: [] as HistoryConversation[] },
    { label: 'Yesterday', items: [] as HistoryConversation[] },
    { label: 'Earlier', items: [] as HistoryConversation[] },
  ] as const;
  for (const conversation of conversations) {
    const day = melbourneDay(conversation.lastAt);
    const group = day === today ? groups[0] : day === yesterday ? groups[1] : groups[2];
    group.items.push(conversation);
  }
  return groups
    .filter((group) => group.items.length > 0)
    .map((group) => ({ label: group.label, items: group.items.sort(byLatest) }));
};
