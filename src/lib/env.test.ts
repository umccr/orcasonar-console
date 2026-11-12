import { afterEach, describe, expect, it, vi } from 'vitest';
import { readEnv } from './env';

describe('runtime settings', () => {
  const original = window.config;
  afterEach(() => {
    window.config = original;
    vi.unstubAllEnvs();
  });

  it('takes a setting from env.js over the build’s, key by key', () => {
    vi.stubEnv('VITE_REGION', 'build-region');
    vi.stubEnv('VITE_OAUTH_DOMAIN', 'build-domain');
    window.config = { VITE_REGION: 'ap-southeast-2', VITE_OAUTH_DOMAIN: '' };

    expect(readEnv('VITE_REGION')).toBe('ap-southeast-2');
    // An empty runtime value doesn't hide one the build has.
    expect(readEnv('VITE_OAUTH_DOMAIN')).toBe('build-domain');
  });

  it('counts empty, blank and non-text values as unset', () => {
    window.config = { A: '  ', B: null, C: 3 };

    expect(readEnv('A')).toBeUndefined();
    expect(readEnv('B')).toBeUndefined();
    expect(readEnv('C')).toBeUndefined();
    expect(readEnv('NOT_THERE')).toBeUndefined();
  });
});
