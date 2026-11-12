import { describe, expect, it } from 'vitest';
import type { ChatEvent } from '@/api/chat-stream';
import { chatReducer, initialChatState, turnOutcome, type ChatAction } from './chat-state';

const play = (...actions: ChatAction[]) => actions.reduce(chatReducer, initialChatState);
const asked: ChatAction = {
  type: 'asked',
  key: 'k1',
  question: 'How do I add a site?',
  askedAt: '2026-11-05T03:30:00.000Z',
};
const event = (value: ChatEvent, at: number): ChatAction => ({
  type: 'event',
  key: 'k1',
  event: value,
  at,
});

describe('a chat turn', () => {
  it('builds the answer as it streams, and times each part', () => {
    const state = play(
      asked,
      event({ event: 'meta', data: { exchangeId: 'x_1', conversationId: 'c_1' } }, 400),
      event({ event: 'delta', data: { text: 'Add one entry ' } }, 800),
      event({ event: 'delta', data: { text: 'to the registry [1].' } }, 3800),
      event(
        {
          event: 'citations',
          data: [
            {
              ref: 1,
              id: 'platform:onboarding',
              title: 'Onboarding a repository',
              url: 'https://docs.umccr.org/platform/onboarding/',
              site: 'platform',
              snippet: '…',
              score: 0.82,
            },
          ],
        },
        4100
      ),
      event(
        {
          event: 'done',
          data: { usage: { inputTokens: 4920, outputTokens: 388 }, costUsd: 0.0213 },
        },
        6400
      ),
      { type: 'closed', key: 'k1', at: 6410 }
    );
    const [turn] = state.turns;
    expect(state.conversationId).toBe('c_1');
    expect(turn).toMatchObject({
      status: 'done',
      answer: 'Add one entry to the registry [1].',
      exchangeId: 'x_1',
      costUsd: 0.0213,
      timing: {
        meta: 400,
        firstDelta: 800,
        lastDelta: 3800,
        deltas: 2,
        citations: 4100,
        done: 6400,
      },
    });
    expect(turn?.sources).toHaveLength(1);
    expect(turn && turnOutcome(turn)).toBe('answered');
  });

  it('was not covered when OrcaSonar called no model', () => {
    const [turn] = play(
      asked,
      event({ event: 'delta', data: { text: 'The documentation does not cover that.' } }, 300),
      event({ event: 'citations', data: [] }, 310),
      event(
        { event: 'done', data: { usage: { inputTokens: 0, outputTokens: 0 }, costUsd: 0.001 } },
        320
      )
    ).turns;
    expect(turn && turnOutcome(turn)).toBe('not-covered');
  });

  it('fails on an error event, keeping the text that came', () => {
    const [turn] = play(
      asked,
      event({ event: 'delta', data: { text: 'Half an answer' } }, 300),
      event({ event: 'error', data: { code: 'unavailable', message: 'Bedrock is busy.' } }, 900)
    ).turns;
    expect(turn).toMatchObject({
      status: 'failed',
      answer: 'Half an answer',
      error: { code: 'unavailable' },
      timing: { end: 900 },
    });
  });

  it('fails when the stream ends without finishing', () => {
    const [turn] = play(asked, event({ event: 'delta', data: { text: 'Half' } }, 300), {
      type: 'closed',
      key: 'k1',
      at: 500,
    }).turns;
    expect(turn).toMatchObject({ status: 'failed', error: { code: 'incomplete' } });
  });

  it('stops when the reader stops it, and not after it finished', () => {
    expect(play(asked, { type: 'stopped', key: 'k1', at: 200 }).turns[0]?.status).toBe('stopped');
    const done = play(
      asked,
      event(
        { event: 'done', data: { usage: { inputTokens: 1, outputTokens: 1 }, costUsd: 0.01 } },
        100
      ),
      { type: 'stopped', key: 'k1', at: 200 }
    );
    expect(done.turns[0]?.status).toBe('done');
  });

  it('starts again on reset', () => {
    expect(
      play(asked, event({ event: 'meta', data: { exchangeId: 'x', conversationId: 'c' } }, 1), {
        type: 'reset',
      })
    ).toEqual(initialChatState);
  });
});
