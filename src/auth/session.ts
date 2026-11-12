import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import 'aws-amplify/auth/enable-oauth-listener';
import { readEnv } from '@/lib/env';

/*
 * Sign-in goes through the portal's Cognito pool and its shared OrcaUI app client, whose settings each stage's
 * env.js carries, as for orca-ui-v2. On the same portal host, a reader signed in to one portal app is signed in here.
 * Locally there are none: the local API answers every request as its own fixed reader, so nobody signs in.
 */
const region = readEnv('VITE_REGION');
const userPoolId = readEnv('VITE_COG_USER_POOL_ID');
const userPoolClientId = readEnv('VITE_COG_APP_CLIENT_ID');
const oauthDomain = readEnv('VITE_OAUTH_DOMAIN');

/** The sign-in settings this page lacks. env.js carries all four on a deployed host; locally there are none. */
export const MISSING_SIGN_IN_SETTINGS = Object.entries({
  VITE_REGION: region,
  VITE_COG_USER_POOL_ID: userPoolId,
  VITE_COG_APP_CLIENT_ID: userPoolClientId,
  VITE_OAUTH_DOMAIN: oauthDomain,
})
  .filter(([, value]) => value === undefined)
  .map(([name]) => name);

/** Whether this page signs readers in. False locally, without env.js settings. */
export const SIGN_IN_ENABLED = MISSING_SIGN_IN_SETTINGS.length === 0;

/**
 * Where Cognito sends the reader back after signing in or out: this app's root, `/orcasonar/`. It must be one of the
 * app client's callback and sign-out URLs, which `portal_app_paths` in the cognito_aai Terraform stack lists.
 */
const APP_URL =
  typeof window === 'undefined' ? '' : `${window.location.origin}${import.meta.env.BASE_URL}`;

if (SIGN_IN_ENABLED && userPoolId && userPoolClientId) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain: `${oauthDomain}.auth.${region}.amazoncognito.com`,
            scopes: ['email', 'openid', 'profile', 'aws.cognito.signin.user.admin'],
            redirectSignIn: [APP_URL],
            redirectSignOut: [APP_URL],
            responseType: 'code',
          },
        },
      },
    },
  });
}

/** The reader's ID token, refreshed when it has expired, as OrcaSonar's authorizer expects; none locally. */
export const idToken = async (): Promise<string | undefined> => {
  if (!SIGN_IN_ENABLED) {
    return undefined;
  }
  try {
    return (await fetchAuthSession()).tokens?.idToken?.toString();
  } catch {
    return undefined;
  }
};

const sessionEndedListeners = new Set<() => void>();

/** Called when OrcaSonar says the token is no good (`401`), so the page can ask the reader to sign in again. */
export const onSessionEnded = (listener: () => void): (() => void) => {
  sessionEndedListeners.add(listener);
  return () => {
    sessionEndedListeners.delete(listener);
  };
};

export const endSession = (): void => {
  for (const listener of sessionEndedListeners) {
    listener();
  }
};
