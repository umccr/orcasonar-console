import { readEnv } from './env';

/** Where the console runs: on a developer's machine, or in one of the two stages OrcaSonar runs in. */
export type Stage = 'local' | 'beta' | 'prod';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** The portal's hostnames, as the portal distribution answers them, by OrcaSonar stage. Staging has no OrcaSonar. */
const PORTAL_HOSTS: Record<string, Exclude<Stage, 'local'>> = {
  'portal.dev.umccr.org': 'beta',
  'orcaui.dev.umccr.org': 'beta',
  'portal.umccr.org': 'prod',
  'portal.prod.umccr.org': 'prod',
  'orcaui.umccr.org': 'prod',
  'orcaui.prod.umccr.org': 'prod',
};

const API_ORIGINS: Record<Exclude<Stage, 'local'>, string> = {
  beta: 'https://sonar.dev.umccr.org',
  prod: 'https://sonar.prod.umccr.org',
};

const API_HOSTS: Record<string, Exclude<Stage, 'local'>> = {
  'sonar.dev.umccr.org': 'beta',
  'sonar.prod.umccr.org': 'prod',
};

/** The stage a hostname belongs to, or undefined for one OrcaSonar does not serve. */
export const stageOf = (hostname: string): Stage | undefined => {
  const host = hostname.toLowerCase();
  return LOCAL_HOSTS.has(host) ? 'local' : PORTAL_HOSTS[host];
};

/**
 * Where to move a page the portal serves on another of its hosts: `orcaui.*` or `portal.prod.umccr.org`. OrcaSonar's
 * CORS and the Cognito app client's callbacks name only `portal.dev.umccr.org` and `portal.umccr.org`, so the console
 * runs there, as OrcaUI v2 does. Undefined when the page is already on its canonical host, or on no portal host.
 */
export const canonicalUrl = (href: string): string | undefined => {
  const url = new URL(href);
  const host = url.hostname.toLowerCase();
  if (PORTAL_HOSTS[host] === undefined) {
    return undefined;
  }
  const canonical = host.replace(/^orcaui\./, 'portal.').replace(/^portal\.prod\./, 'portal.');
  if (canonical === host) {
    return undefined;
  }
  url.hostname = canonical;
  return url.toString();
};

/** The stage of an OrcaSonar API by its address: any API but beta's and prod's is a local one. */
export const apiStageOf = (url: string): Stage => {
  try {
    return API_HOSTS[new URL(url).hostname.toLowerCase()] ?? 'local';
  } catch {
    return 'local';
  }
};

/**
 * OrcaSonar's API for a stage: its own host in beta and prod, and `/api/v1` on the dev server locally, which Vite
 * sends on to OrcaSonar dev or the in-memory API. `VITE_ORCASONAR_URL` overrides it, as an origin such as
 * `https://sonar.dev.umccr.org`.
 */
export const apiBaseUrl = (stage: Stage | undefined, override?: string): string | undefined => {
  if (override) {
    return `${override.replace(/\/+$/, '')}/api/v1`;
  }
  if (stage === undefined) {
    return undefined;
  }
  return stage === 'local' ? '/api/v1' : `${API_ORIGINS[stage]}/api/v1`;
};

const hostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname;

/** This page's stage. */
export const STAGE = stageOf(hostname);

/** This page's API, or undefined on a host OrcaSonar does not serve. */
export const API_BASE_URL = apiBaseUrl(STAGE, readEnv('VITE_ORCASONAR_URL'));

/** Where the dev server sends the page's requests, locally. */
const DEV_API_TARGET =
  typeof __DEV_API_TARGET__ === 'string' && __DEV_API_TARGET__ !== ''
    ? __DEV_API_TARGET__
    : undefined;

/** Where the page's requests end up: the API itself, or locally the dev server's target, when known. */
const API_ORIGIN = API_BASE_URL?.startsWith('/') ? DEV_API_TARGET : API_BASE_URL;

/** The stage of the API the page calls. Locally that can be beta: `make start` calls OrcaSonar dev. */
export const API_STAGE: Stage | undefined =
  API_BASE_URL === undefined
    ? undefined
    : API_ORIGIN === undefined
      ? 'local'
      : apiStageOf(API_ORIGIN);

/** The API's host, for showing where requests go. */
export const API_HOST =
  API_BASE_URL === undefined
    ? undefined
    : API_ORIGIN === undefined
      ? 'local API'
      : new URL(API_ORIGIN).host;
