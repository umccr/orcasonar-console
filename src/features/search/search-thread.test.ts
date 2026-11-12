import { describe, expect, it } from 'vitest';
import { loadThread, ranked, saveThread, type SearchTurn } from './search-thread';

const turn = (key: string, status: SearchTurn['status']): SearchTurn => ({
  key,
  query: key,
  topK: 8,
  sites: [],
  askedAt: '2026-11-05T03:30:00.000Z',
  status,
});

describe('the search thread', () => {
  it('ranks passages best first', () => {
    const result = (id: string, score: number) => ({
      id,
      title: id,
      url: 'https://x',
      site: 'platform',
      snippet: '',
      score,
    });
    expect(
      ranked([result('b', 0.4), result('a', 0.82), result('c', 0.71)]).map(
        ({ rank, result: r }) => `${rank}:${r.id}`
      )
    ).toEqual(['1:a', '2:c', '3:b']);
  });

  it('comes back in the same tab, without a search that never finished', () => {
    saveThread([turn('done', 'done'), turn('pending', 'pending'), turn('failed', 'failed')]);
    expect(loadThread().map((t) => t.key)).toEqual(['done', 'failed']);
  });

  it('starts empty when what was kept is unreadable', () => {
    sessionStorage.setItem('orcasonar-console.search-thread', '{not json');
    expect(loadThread()).toEqual([]);
  });
});
