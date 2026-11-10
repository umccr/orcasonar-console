import { describe, expect, it } from 'vitest';
import { apiBaseUrl, apiStageOf, canonicalUrl, stageOf } from './stage';
import { DEFAULT_RANGE, isRange, windowFor } from './window';

describe('stage', () => {
  it('knows the portal hosts OrcaSonar runs behind', () => {
    expect(stageOf('portal.dev.umccr.org')).toBe('beta');
    expect(stageOf('orcaui.dev.umccr.org')).toBe('beta');
    expect(stageOf('portal.umccr.org')).toBe('prod');
    expect(stageOf('PORTAL.PROD.UMCCR.ORG')).toBe('prod');
    expect(stageOf('localhost')).toBe('local');
    expect(stageOf('127.0.0.1')).toBe('local');
  });

  it('has no stage for staging, where OrcaSonar does not run, or for other hosts', () => {
    expect(stageOf('portal.stg.umccr.org')).toBeUndefined();
    expect(stageOf('example.org')).toBeUndefined();
  });

  it('calls each stage’s own API, and the dev server’s locally', () => {
    expect(apiBaseUrl('beta')).toBe('https://sonar.dev.umccr.org/api/v1');
    expect(apiBaseUrl('prod')).toBe('https://sonar.prod.umccr.org/api/v1');
    expect(apiBaseUrl('local')).toBe('/api/v1');
    expect(apiBaseUrl(undefined)).toBeUndefined();
  });

  it('tells which stage an API is from its address, as the dev server’s proxy target', () => {
    expect(apiStageOf('https://sonar.dev.umccr.org')).toBe('beta');
    expect(apiStageOf('https://sonar.prod.umccr.org/api/v1')).toBe('prod');
    expect(apiStageOf('http://127.0.0.1:8787')).toBe('local');
    expect(apiStageOf('not a url')).toBe('local');
  });

  it('moves a page on another portal host to the one OrcaSonar and Cognito know, keeping the rest', () => {
    expect(canonicalUrl('https://orcaui.dev.umccr.org/orcasonar/audit?range=30d#x')).toBe(
      'https://portal.dev.umccr.org/orcasonar/audit?range=30d#x'
    );
    expect(canonicalUrl('https://portal.prod.umccr.org/orcasonar/')).toBe(
      'https://portal.umccr.org/orcasonar/'
    );
    expect(canonicalUrl('https://orcaui.prod.umccr.org/orcasonar/chat')).toBe(
      'https://portal.umccr.org/orcasonar/chat'
    );
    expect(canonicalUrl('https://orcaui.umccr.org/orcasonar/')).toBe(
      'https://portal.umccr.org/orcasonar/'
    );
  });

  it('leaves a canonical host, a local one and any other alone', () => {
    expect(canonicalUrl('https://portal.dev.umccr.org/orcasonar/')).toBeUndefined();
    expect(canonicalUrl('https://portal.umccr.org/orcasonar/')).toBeUndefined();
    expect(canonicalUrl('http://localhost:3000/orcasonar/')).toBeUndefined();
    expect(canonicalUrl('https://orcaui.example.org/')).toBeUndefined();
  });

  it('lets VITE_ORCASONAR_URL name the API instead', () => {
    expect(apiBaseUrl('local', 'https://sonar.dev.umccr.org/')).toBe(
      'https://sonar.dev.umccr.org/api/v1'
    );
    expect(apiBaseUrl(undefined, 'http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787/api/v1');
  });
});

describe('window', () => {
  it('covers a range up to a fixed end', () => {
    const now = Date.parse('2026-11-05T12:00:00Z');
    expect(windowFor('7d', now)).toEqual({
      from: '2026-10-29T12:00:00.000Z',
      to: '2026-11-05T12:00:00.000Z',
    });
    expect(windowFor('24h', now).from).toBe('2026-11-04T12:00:00.000Z');
  });

  it('takes only the ranges it offers, a week by default', () => {
    expect(isRange('30d')).toBe(true);
    expect(isRange('90d')).toBe(false);
    expect(isRange(null)).toBe(false);
    expect(DEFAULT_RANGE).toBe('7d');
  });
});
