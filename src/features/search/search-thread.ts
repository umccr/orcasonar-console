import type { SearchResult } from '@/api/types';

/** One search in the thread, and what came back. */
export interface SearchTurn {
  readonly key: string;
  readonly query: string;
  readonly topK: number;
  readonly sites: readonly string[];
  readonly askedAt: string;
  readonly status: 'pending' | 'done' | 'failed';
  readonly results?: readonly SearchResult[];
  /** How long the search took, from the console. */
  readonly ms?: number;
  readonly error?: { readonly status: number; readonly code: string; readonly message: string };
}

const KEY = 'orcasonar-console.search-thread';
const KEEP = 30;

/** The thread from this tab's earlier visits to the page. A search still pending when the page closed is dropped. */
export const loadThread = (): SearchTurn[] => {
  try {
    const raw = sessionStorage.getItem(KEY);
    const turns = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(turns)
      ? (turns as SearchTurn[]).filter((turn) => turn.status !== 'pending')
      : [];
  } catch {
    return [];
  }
};

/** Keeps the latest searches for this tab only: nothing leaves the browser, and closing the tab clears them. */
export const saveThread = (turns: readonly SearchTurn[]): void => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(turns.slice(-KEEP)));
  } catch {
    // Not kept, as in a private window; the thread still works for this visit.
  }
};

/** Results best first, numbered by that rank. */
export const ranked = (
  results: readonly SearchResult[]
): { rank: number; result: SearchResult }[] =>
  [...results]
    .sort((a, b) => b.score - a.score)
    .map((result, index) => ({ rank: index + 1, result }));
