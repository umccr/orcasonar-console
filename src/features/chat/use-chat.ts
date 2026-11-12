import { useCallback, useEffect, useReducer, useRef } from 'react';
import { reportApiStatus } from '@/api/api-status';
import { streamChat } from '@/api/chat-stream';
import { ApiError, isApiError } from '@/api/errors';
import { endSession } from '@/auth/session';
import { noteSites } from '@/lib/known-sites';
import { chatReducer, initialChatState } from './chat-state';

/** A chat with OrcaSonar: the turns asked in this session, streamed one at a time. */
export const useChat = () => {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const controller = useRef<AbortController | null>(null);

  // Stop streaming into a page that has gone.
  useEffect(() => () => controller.current?.abort(), []);

  const ask = useCallback(
    async (
      question: string,
      { sites, conversationId }: { sites?: readonly string[]; conversationId?: string }
    ) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      const key = crypto.randomUUID();
      const started = performance.now();
      const elapsed = () => Math.round(performance.now() - started);
      dispatch({ type: 'asked', key, question, sites, askedAt: new Date().toISOString() });
      try {
        await streamChat(
          {
            query: question,
            mode: 'ask',
            ...(conversationId ? { conversationId } : {}),
            ...(sites && sites.length > 0 ? { sites: [...sites] } : {}),
          },
          {
            signal: abort.signal,
            onEvent: (event) => {
              dispatch({ type: 'event', key, event, at: elapsed() });
              if (event.event === 'citations') {
                noteSites(event.data.map((citation) => citation.site));
              }
            },
          }
        );
        dispatch({ type: 'closed', key, at: elapsed() });
        reportApiStatus('ok');
      } catch (error) {
        if (abort.signal.aborted) {
          dispatch({ type: 'stopped', key, at: elapsed() });
          return;
        }
        const failure = isApiError(error) ? error : ApiError.network(error);
        reportApiStatus(failure.status === 0 ? 'unreachable' : 'ok');
        if (failure.status === 401) {
          endSession();
        }
        dispatch({
          type: 'failed',
          key,
          at: elapsed(),
          error: {
            status: failure.status,
            code: failure.code,
            message: failure.message,
            retryAfter: failure.retryAfter,
          },
        });
      } finally {
        if (controller.current === abort) {
          controller.current = null;
        }
      }
    },
    []
  );

  const stop = useCallback(() => controller.current?.abort(), []);

  const reset = useCallback(() => {
    controller.current?.abort();
    dispatch({ type: 'reset' });
  }, []);

  return { state, ask, stop, reset };
};
