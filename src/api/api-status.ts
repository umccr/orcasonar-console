import { useSyncExternalStore } from 'react';

/**
 * Whether OrcaSonar answered the console's last request. OrcaSonar's `/health` sends no CORS headers, so a page on
 * the portal can't read it; the console's own requests say as much.
 */
export type ApiStatus = 'unknown' | 'ok' | 'unreachable';

let status: ApiStatus = 'unknown';
const listeners = new Set<() => void>();

export const reportApiStatus = (next: ApiStatus): void => {
  if (next !== status) {
    status = next;
    for (const listener of listeners) {
      listener();
    }
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useApiStatus = (): ApiStatus => useSyncExternalStore(subscribe, () => status);
