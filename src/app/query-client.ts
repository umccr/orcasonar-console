import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { reportApiStatus } from '@/api/api-status';
import { isApiError } from '@/api/errors';
import { endSession } from '@/auth/session';

const noteFailure = (error: unknown) => {
  if (!isApiError(error)) {
    return;
  }
  reportApiStatus(error.status === 0 ? 'unreachable' : 'ok');
  if (error.status === 401) {
    endSession();
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onSuccess: () => reportApiStatus('ok'), onError: noteFailure }),
  mutationCache: new MutationCache({
    onSuccess: () => reportApiStatus('ok'),
    onError: noteFailure,
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // A refusal is an answer: retry only what may pass on a second try.
      retry: (failures, error) =>
        failures < 2 && (!isApiError(error) || error.status === 0 || error.status >= 500),
    },
    mutations: { retry: false },
  },
});
