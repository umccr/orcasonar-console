import { API_STAGE } from './stage';

/**
 * A source's page on the docs site the API's answers come from. OrcaSonar links every page to `docs.umccr.org`; beta
 * answers from `docs.dev.umccr.org`, as the docs panel there rewrites them, including for a console run locally
 * against OrcaSonar dev.
 */
export const docsUrl = (url: string): string =>
  API_STAGE === 'beta'
    ? url.replace(/^https:\/\/docs\.umccr\.org(?=\/|$)/, 'https://docs.dev.umccr.org')
    : url;
