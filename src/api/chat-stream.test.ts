import { describe, expect, it } from 'vitest';
import { answer, json, requests, sse } from '@/test/fetch-mock';
import { readChatEvents, streamChat, toChatEvent, type ChatEvent } from './chat-stream';
import { ApiError } from './errors';

const EVENTS = [
  { event: 'meta', data: { exchangeId: 'x_1', conversationId: 'c_1' } },
  { event: 'delta', data: { text: 'Add one entry to the site registry [1], ' } },
  { event: 'delta', data: { text: 'then push your docs [2].' } },
  { event: 'citations', data: [{ ref: 1, id: 'platform:onboarding', score: 0.82 }] },
  { event: 'done', data: { usage: { inputTokens: 4920, outputTokens: 388 }, costUsd: 0.0213 } },
];

describe('the chat stream', () => {
  it('reads each event once, however the bytes are split', async () => {
    const seen: ChatEvent[] = [];
    const body = sse(EVENTS).body;
    expect(body).not.toBeNull();
    await readChatEvents(body as ReadableStream<Uint8Array<ArrayBuffer>>, (event) =>
      seen.push(event)
    );
    expect(seen.map((event) => event.event)).toEqual([
      'meta',
      'delta',
      'delta',
      'citations',
      'done',
    ]);
    expect(seen.at(-1)).toEqual(EVENTS.at(-1));
  });

  it('skips events it does not know and data that is not JSON', () => {
    expect(toChatEvent({ event: 'ping', data: '{}' })).toBeUndefined();
    expect(toChatEvent({ event: undefined, data: '{}' })).toBeUndefined();
    expect(toChatEvent({ event: 'delta', data: 'not json' })).toBeUndefined();
    expect(toChatEvent({ event: 'delta', data: '{"text":"a"}' })).toEqual({
      event: 'delta',
      data: { text: 'a' },
    });
  });

  it('asks for a stream, with the follow-up and sites', async () => {
    answer(() => sse(EVENTS));
    await streamChat(
      { query: 'And then?', mode: 'ask', conversationId: 'c_1', sites: ['platform'] },
      { signal: new AbortController().signal, onEvent: () => undefined }
    );
    const [request] = requests;
    expect(request?.url).toBe('https://sonar.test/api/v1/chat');
    expect(request?.headers.get('Accept')).toBe('text/event-stream');
    expect(await request?.json()).toEqual({
      query: 'And then?',
      mode: 'ask',
      conversationId: 'c_1',
      sites: ['platform'],
    });
  });

  it('throws a refusal as OrcaSonar sent it, with when to retry', async () => {
    answer(() =>
      json(
        { error: { code: 'over-budget', message: 'Today’s allowance is used.', retryAfter: 600 } },
        429
      )
    );
    const asking = streamChat(
      { query: 'Again?', mode: 'ask' },
      { signal: new AbortController().signal, onEvent: () => undefined }
    );
    await expect(asking).rejects.toBeInstanceOf(ApiError);
    await expect(asking).rejects.toMatchObject({
      status: 429,
      code: 'over-budget',
      retryAfter: 600,
    });
  });

  it('says so when OrcaSonar cannot be reached', async () => {
    answer(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(
      streamChat(
        { query: 'Hello?', mode: 'ask' },
        { signal: new AbortController().signal, onEvent: () => undefined }
      )
    ).rejects.toMatchObject({ status: 0, code: 'network' });
  });
});
