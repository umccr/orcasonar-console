import { useSyncExternalStore } from 'react';

/*
 * OrcaSonar has no list of its docs sites, so the console offers the sites it has seen in answers, searches and the
 * audit log this visit, and takes any other slug typed in.
 */
let sites: readonly string[] = [];
const listeners = new Set<() => void>();

export const noteSites = (found: Iterable<string | undefined>): void => {
  const next = new Set(sites);
  for (const site of found) {
    if (site) {
      next.add(site);
    }
  }
  if (next.size !== sites.length) {
    sites = [...next].sort();
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

export const useKnownSites = (): readonly string[] => useSyncExternalStore(subscribe, () => sites);
