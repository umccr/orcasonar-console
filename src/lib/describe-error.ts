import { isApiError } from '@/api/errors';
import { formatWait } from './format';

export interface ErrorText {
  readonly title: string;
  readonly description: string;
}

/** What went wrong, in words for the person using the console. */
export const describeError = (error: unknown): ErrorText => {
  if (!isApiError(error)) {
    return {
      title: 'Something went wrong',
      description: error instanceof Error ? error.message : String(error),
    };
  }
  const wait = error.retryAfter === undefined ? '' : ` (in ${formatWait(error.retryAfter)})`;
  switch (error.code) {
    case 'network':
      return {
        title: "Couldn't reach OrcaSonar",
        description: 'Check your connection, then try again.',
      };
    case 'unauthorized':
      return { title: 'Your session has ended', description: 'Sign in again to carry on.' };
    case 'forbidden':
      return { title: 'Not allowed', description: error.message };
    case 'not-found':
      return { title: 'Not found', description: error.message };
    case 'over-budget':
      return {
        title: "You've used today's allowance",
        description: `It resets at midnight Melbourne time${wait}.`,
      };
    case 'throttled':
      return {
        title: 'Too many requests',
        description: `OrcaSonar is getting more requests than it takes. Try again${wait || ' in a moment'}.`,
      };
    case 'unavailable':
      return {
        title: 'OrcaSonar is busy',
        description: `${error.message} Try again in a moment.`,
      };
    case 'invalid-request':
      return { title: "OrcaSonar couldn't take that request", description: error.message };
    default:
      return { title: 'OrcaSonar had a problem', description: error.message };
  }
};

/** True for the `403` OrcaSonar gives a reader outside the audit group. */
export const isForbidden = (error: unknown): boolean => isApiError(error) && error.status === 403;
