import { useState } from 'react';

/**
 * Where a reader is in a list the API pages by cursor: the cursor of each page reached so far, the first page's being
 * none. Going back is popping a cursor; a new `resetKey`, as when a filter changes, starts again at the first page.
 */
export const useCursorPages = (
  resetKey: string
): {
  page: number;
  cursor: string | undefined;
  next: (cursor: string) => void;
  previous: () => void;
} => {
  const [state, setState] = useState<{ key: string; cursors: (string | undefined)[] }>({
    key: resetKey,
    cursors: [undefined],
  });
  // Adjusted while rendering rather than in an effect, so a stale page is never requested.
  const current = state.key === resetKey ? state : { key: resetKey, cursors: [undefined] };
  if (current !== state) {
    setState(current);
  }
  const page = current.cursors.length - 1;
  return {
    page,
    cursor: current.cursors[page],
    next: (cursor) => setState({ key: resetKey, cursors: [...current.cursors, cursor] }),
    previous: () =>
      setState({
        key: resetKey,
        cursors: current.cursors.length > 1 ? current.cursors.slice(0, -1) : current.cursors,
      }),
  };
};
