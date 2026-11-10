import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import type { AuditWindow } from '@/lib/window';
import { api, expectOk, unwrap } from './client';
import type { AuditOutcome } from './types';

/** Usage for a window: totals, and every reader's numbers. */
export const useAuditUsage = (window: AuditWindow) =>
  useQuery({
    queryKey: ['audit', 'usage', window.from, window.to],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/audit/usage', { params: { query: { from: window.from, to: window.to } }, signal })
      ),
  });

/** A page of an audit list. The first page names the window; later ones pass the cursor, which keeps it. */
export interface AuditListParams {
  readonly window: AuditWindow;
  readonly caller?: string;
  readonly outcome?: AuditOutcome;
  readonly limit: number;
  readonly cursor?: string;
}

const listQuery = ({ window, caller, outcome, limit, cursor }: AuditListParams) =>
  cursor === undefined
    ? { from: window.from, to: window.to, caller, outcome, limit }
    : { caller, outcome, limit, cursor };

export const useAuditConversations = (params: AuditListParams) =>
  useQuery({
    queryKey: ['audit', 'conversations', params],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/audit/conversations', { params: { query: listQuery(params) }, signal })),
    placeholderData: keepPreviousData,
  });

export const useAuditExchanges = (params: AuditListParams) =>
  useQuery({
    queryKey: ['audit', 'exchanges', params],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/audit/exchanges', { params: { query: listQuery(params) }, signal })),
    placeholderData: keepPreviousData,
  });

/** One conversation as the audit log holds it, oldest exchange first. */
export const useAuditConversation = (conversationId: string | undefined) =>
  useQuery({
    queryKey: ['audit', 'conversation', conversationId],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/audit/conversations/{conversationId}', {
          params: { path: { conversationId: conversationId ?? '' } },
          signal,
        })
      ),
    enabled: conversationId !== undefined,
  });

/** The signed-in reader's conversations from the last 30 days, most recently active first. */
export const useHistory = (enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET('/chat/history', { params: { query: { limit: 50, cursor: pageParam } }, signal })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
  });

/** One of the reader's own conversations, as they saw it. */
export const useHistoryConversation = (conversationId: string | undefined) =>
  useQuery({
    queryKey: ['history', conversationId],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/chat/history/{conversationId}', {
          params: { path: { conversationId: conversationId ?? '' } },
          signal,
        })
      ),
    enabled: conversationId !== undefined,
    // Fetched afresh each time Chat opens it, so follow-ups asked since are there.
    staleTime: 0,
  });

/** A docs page, by a source's `id`. */
export const useDocument = (id: string | undefined) =>
  useQuery({
    queryKey: ['document', id],
    queryFn: ({ signal }) =>
      unwrap(api.GET('/documents/{id}', { params: { path: { id: id ?? '' } }, signal })),
    enabled: id !== undefined,
    staleTime: 5 * 60_000,
  });

export interface SearchParams {
  readonly query: string;
  readonly topK: number;
  readonly sites?: string[];
}

export const useSearch = () =>
  useMutation({
    mutationFn: (body: SearchParams) => unwrap(api.POST('/search', { body })),
  });

export interface FeedbackParams {
  readonly exchangeId: string;
  readonly rating: 'up' | 'down';
}

export const useFeedback = () =>
  useMutation({
    mutationFn: (body: FeedbackParams) => expectOk(api.POST('/feedback', { body })),
  });
