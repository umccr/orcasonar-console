declare global {
  interface Window {
    /** The stage's settings, from `env.js`, which the portal pipeline writes at deploy. */
    config?: Record<string, unknown>;
  }
}

const isSet = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/**
 * A setting the page reads at run time, key by key: from `window.config` when the stage's `env.js` sets it, or from
 * Vite's `VITE_*` variables otherwise, as in local development. Empty values count as unset, so a partly filled
 * `env.js` never hides a setting the environment has.
 */
export const readEnv = (name: string): string | undefined => {
  const runtime = typeof window === 'undefined' ? undefined : window.config?.[name];
  const value = isSet(runtime) ? runtime : (import.meta.env as Record<string, unknown>)[name];
  return isSet(value) ? value.trim() : undefined;
};
