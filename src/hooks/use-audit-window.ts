import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_RANGE, isRange, windowFor, type AuditWindow, type Range } from '@/lib/window';

/**
 * The audit window a page shows: the range in the URL (`?range=30d`), up to the moment it was chosen or last
 * refreshed. Holding the end fixed keeps every request for the window, and every page of it, the same.
 */
export const useAuditWindow = (): {
  range: Range;
  window: AuditWindow;
  setRange: (range: Range) => void;
  refresh: () => void;
} => {
  const [params, setParams] = useSearchParams();
  const raw = params.get('range');
  const range = isRange(raw) ? raw : DEFAULT_RANGE;
  const [asOf, setAsOf] = useState(() => Date.now());
  const window = useMemo(() => windowFor(range, asOf), [range, asOf]);

  const setRange = useCallback(
    (next: Range) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          if (next === DEFAULT_RANGE) {
            updated.delete('range');
          } else {
            updated.set('range', next);
          }
          return updated;
        },
        { replace: true }
      );
      setAsOf(Date.now());
    },
    [setParams]
  );

  const refresh = useCallback(() => setAsOf(Date.now()), []);
  return { range, window, setRange, refresh };
};
