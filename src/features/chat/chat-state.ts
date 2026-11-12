import type { ChatEvent } from '@/api/chat-stream';
import { toAnswerSources, type AnswerSource, type Usage } from '@/api/types';

/** When each part of an answer arrived, in milliseconds from sending the question. */
export interface Timing {
  readonly meta?: number;
  readonly firstDelta?: number;
  readonly lastDelta?: number;
  readonly deltas: number;
  readonly citations?: number;
  readonly done?: number;
  /** When the stream closed, failed or was stopped. */
  readonly end?: number;
}

export interface TurnError {
  /** The HTTP status of a refusal, or 0 for an error inside the stream or no response. */
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly retryAfter?: number;
}

export type TurnStatus = 'streaming' | 'done' | 'failed' | 'stopped';

/** A question asked in this session, and its answer as it streams in. */
export interface ChatTurn {
  readonly key: string;
  readonly question: string;
  readonly askedAt: string;
  readonly sites?: readonly string[];
  readonly status: TurnStatus;
  readonly answer: string;
  readonly sources: readonly AnswerSource[];
  readonly exchangeId?: string;
  readonly usage?: Usage;
  readonly costUsd?: number;
  readonly error?: TurnError;
  readonly timing: Timing;
  /** The data of every event but the deltas, as it arrived, for the Inspect panel. */
  readonly events: { readonly [event in 'meta' | 'citations' | 'done' | 'error']?: unknown };
}

export interface ChatState {
  /** The conversation a follow-up continues, once OrcaSonar has named it. */
  readonly conversationId?: string;
  readonly turns: readonly ChatTurn[];
}

export const initialChatState: ChatState = { turns: [] };

export type ChatAction =
  | {
      readonly type: 'asked';
      readonly key: string;
      readonly question: string;
      readonly sites?: readonly string[];
      readonly askedAt: string;
    }
  | { readonly type: 'event'; readonly key: string; readonly event: ChatEvent; readonly at: number }
  | { readonly type: 'closed'; readonly key: string; readonly at: number }
  | {
      readonly type: 'failed';
      readonly key: string;
      readonly error: TurnError;
      readonly at: number;
    }
  | { readonly type: 'stopped'; readonly key: string; readonly at: number }
  | { readonly type: 'reset' };

const update = (
  state: ChatState,
  key: string,
  change: (turn: ChatTurn) => ChatTurn
): ChatState => ({
  ...state,
  turns: state.turns.map((turn) => (turn.key === key ? change(turn) : turn)),
});

const withEvent = (state: ChatState, key: string, event: ChatEvent, at: number): ChatState => {
  switch (event.event) {
    case 'meta':
      return {
        ...update(state, key, (turn) => ({
          ...turn,
          exchangeId: event.data.exchangeId,
          timing: { ...turn.timing, meta: at },
          events: { ...turn.events, meta: event.data },
        })),
        conversationId: event.data.conversationId,
      };
    case 'delta':
      return update(state, key, (turn) => ({
        ...turn,
        answer: turn.answer + event.data.text,
        timing: {
          ...turn.timing,
          firstDelta: turn.timing.firstDelta ?? at,
          lastDelta: at,
          deltas: turn.timing.deltas + 1,
        },
      }));
    case 'citations':
      return update(state, key, (turn) => ({
        ...turn,
        sources: toAnswerSources(event.data),
        timing: { ...turn.timing, citations: at },
        events: { ...turn.events, citations: event.data },
      }));
    case 'done':
      return update(state, key, (turn) => ({
        ...turn,
        status: 'done',
        usage: event.data.usage,
        costUsd: event.data.costUsd,
        timing: { ...turn.timing, done: at },
        events: { ...turn.events, done: event.data },
      }));
    case 'error':
      return update(state, key, (turn) => ({
        ...turn,
        status: 'failed',
        error: { status: 0, code: event.data.code, message: event.data.message },
        timing: { ...turn.timing, end: at },
        events: { ...turn.events, error: event.data },
      }));
  }
};

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'asked':
      return {
        ...state,
        turns: [
          ...state.turns,
          {
            key: action.key,
            question: action.question,
            askedAt: action.askedAt,
            sites: action.sites,
            status: 'streaming',
            answer: '',
            sources: [],
            timing: { deltas: 0 },
            events: {},
          },
        ],
      };
    case 'event':
      return withEvent(state, action.key, action.event, action.at);
    case 'closed':
      // A stream that ends without `done` or `error` was cut off.
      return update(state, action.key, (turn) =>
        turn.status === 'streaming'
          ? {
              ...turn,
              status: 'failed',
              error: {
                status: 0,
                code: 'incomplete',
                message: 'The answer stopped before it finished.',
              },
              timing: { ...turn.timing, end: action.at },
            }
          : { ...turn, timing: { ...turn.timing, end: turn.timing.end ?? action.at } }
      );
    case 'failed':
      return update(state, action.key, (turn) => ({
        ...turn,
        status: 'failed',
        error: action.error,
        timing: { ...turn.timing, end: action.at },
      }));
    case 'stopped':
      return update(state, action.key, (turn) =>
        turn.status === 'streaming'
          ? { ...turn, status: 'stopped', timing: { ...turn.timing, end: action.at } }
          : turn
      );
    case 'reset':
      return initialChatState;
  }
};

export type TurnOutcome = 'streaming' | 'answered' | 'not-covered' | 'failed' | 'stopped';

/**
 * How a live answer ended. OrcaSonar calls no model when nothing relevant is found, so an answer that took no tokens
 * was not covered.
 */
export const turnOutcome = (turn: ChatTurn): TurnOutcome => {
  if (turn.status !== 'done') {
    return turn.status;
  }
  return turn.usage?.inputTokens === 0 && turn.usage.outputTokens === 0
    ? 'not-covered'
    : 'answered';
};
