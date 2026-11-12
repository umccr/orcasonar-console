import { useCallback, useState } from 'react';

const PREFIX = 'orcasonar-console.';

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return allowed.find((choice) => choice === value) ?? fallback;
  } catch {
    return fallback;
  }
};

/** A choice this browser remembers, such as a table's density. It works, unremembered, where storage is blocked. */
export const useStoredChoice = <T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T
): [T, (value: T) => void] => {
  const [value, setValue] = useState<T>(() => read(key, allowed, fallback));
  const choose = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(PREFIX + key, next);
      } catch {
        // Kept for this visit only.
      }
    },
    [key]
  );
  return [value, choose];
};
