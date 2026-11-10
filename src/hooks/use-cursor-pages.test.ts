import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCursorPages } from './use-cursor-pages';

describe('cursor pages', () => {
  it('goes forward by cursor, back by popping, and starts again when the list changes', () => {
    const { result, rerender } = renderHook(({ key }) => useCursorPages(key), {
      initialProps: { key: 'a' },
    });
    expect(result.current).toMatchObject({ page: 0, cursor: undefined });

    act(() => result.current.next('cursor-2'));
    act(() => result.current.next('cursor-3'));
    expect(result.current).toMatchObject({ page: 2, cursor: 'cursor-3' });

    act(() => result.current.previous());
    expect(result.current).toMatchObject({ page: 1, cursor: 'cursor-2' });

    rerender({ key: 'b' });
    expect(result.current).toMatchObject({ page: 0, cursor: undefined });

    act(() => result.current.previous());
    expect(result.current.page).toBe(0);
  });
});
