import { EventSourceParserStream } from 'eventsource-parser/stream';
import { idToken } from '@/auth/session';
import { API_BASE_URL } from '@/lib/stage';
import { ApiError } from './errors';
import type { ChatRequest, Citation, Usage } from './types';

/** The events `POST /chat` streams, in order: `meta`, `delta`…, `citations`, `done`. `error` may end it early. */
export type ChatEvent =
  | { readonly event: 'meta'; readonly data: { exchangeId: string; conversationId: string } }
  | { readonly event: 'delta'; readonly data: { text: string } }
  | { readonly event: 'citations'; readonly data: Citation[] }
  | { readonly event: 'done'; readonly data: { usage: Usage; costUsd: number } }
  | { readonly event: 'error'; readonly data: { code: string; message: string } };

const EVENT_NAMES = new Set<string>(['meta', 'delta', 'citations', 'done', 'error']);

/** One server-sent event as a chat event; an event the console doesn't know, or data that isn't JSON, is skipped. */
export const toChatEvent = (message: {
  event?: string | undefined;
  data: string;
}): ChatEvent | undefined => {
  if (message.event === undefined || !EVENT_NAMES.has(message.event)) {
    return undefined;
  }
  try {
    return { event: message.event, data: JSON.parse(message.data) as unknown } as ChatEvent;
  } catch {
    return undefined;
  }
};

/** Reads a stream of server-sent events to its end, passing on each chat event as it arrives. */
export const readChatEvents = async (
  body: ReadableStream<Uint8Array<ArrayBuffer>>,
  onEvent: (event: ChatEvent) => void
): Promise<void> => {
  const reader = body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())
    .getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      const event = toChatEvent(value);
      if (event) {
        onEvent(event);
      }
    }
  } finally {
    reader.releaseLock();
  }
};

/**
 * Asks OrcaSonar a question, streaming the answer. A refusal before the stream starts, such as `429 over-budget`, is
 * thrown as an {@link ApiError}; stopping it through `signal` throws an `AbortError`.
 */
export const streamChat = async (
  request: ChatRequest,
  { signal, onEvent }: { signal: AbortSignal; onEvent: (event: ChatEvent) => void }
): Promise<void> => {
  const token = await idToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL ?? '/api/v1'}/chat`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    throw signal.aborted ? error : ApiError.network(error);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as unknown;
    throw ApiError.fromResponse(response, body);
  }
  if (!response.body) {
    throw new ApiError(response.status, 'empty', 'OrcaSonar sent no answer.');
  }
  await readChatEvents(response.body, onEvent);
};
