import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchAuthSession, signInWithRedirect, signOut as amplifySignOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { toast } from 'sonner';
import { AuthContext, type AuthState, type Reader } from './auth-context';
import { API_STAGE } from '@/lib/stage';
import { keepReturnPath } from './return-path';
import { onSessionEnded, SIGN_IN_ENABLED } from './session';

/**
 * Who the console runs as without sign-in: the reader the in-memory API answers as (`make dev` in umccr/orcasonar),
 * who is in the audit group, or nobody, against an API that wants a token.
 */
const LOCAL_READER: Reader =
  API_STAGE === 'local'
    ? { email: 'local-reader@example.org', name: 'Local reader', groups: ['admin'] }
    : { name: 'Not signed in', groups: [] };

const claim = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const currentReader = async (): Promise<Reader | undefined> => {
  try {
    const claims = (await fetchAuthSession()).tokens?.idToken?.payload;
    if (!claims) {
      return undefined;
    }
    const groups = claims['cognito:groups'];
    const fullName = [claim(claims.given_name), claim(claims.family_name)]
      .filter(Boolean)
      .join(' ');
    return {
      email: claim(claims.email),
      name: claim(claims.name) ?? (fullName || undefined),
      groups: Array.isArray(groups)
        ? groups.filter((group): group is string => typeof group === 'string')
        : [],
    };
  } catch {
    return undefined;
  }
};

/** True while the code Cognito sent the reader back with is being exchanged for tokens. */
const returningFromSignIn = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return params.has('code') && params.has('state');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    SIGN_IN_ENABLED ? { status: 'loading' } : { status: 'local', reader: LOCAL_READER }
  );

  useEffect(() => {
    if (!SIGN_IN_ENABLED) {
      return undefined;
    }
    let active = true;
    const resolve = async () => {
      const reader = await currentReader();
      if (!active) {
        return;
      }
      if (reader) {
        setState({ status: 'signed-in', reader });
      } else if (!returningFromSignIn()) {
        setState({ status: 'signed-out' });
      }
    };
    void resolve();
    const stopListening = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signInWithRedirect':
          void resolve();
          break;
        case 'signInWithRedirect_failure':
          setState({ status: 'signed-out', reason: 'failed' });
          break;
        case 'tokenRefresh_failure':
          setState({ status: 'signed-out', reason: 'expired' });
          break;
        case 'signedOut':
          setState({ status: 'signed-out' });
          break;
      }
    });
    const stopWatching = onSessionEnded(() =>
      setState({ status: 'signed-out', reason: 'expired' })
    );
    return () => {
      active = false;
      stopListening();
      stopWatching();
    };
  }, []);

  const signIn = useCallback(async () => {
    keepReturnPath();
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      // Tokens the API no longer accepts are still held: sign out first, which comes back here to sign in afresh.
      if (error instanceof Error && error.name === 'UserAlreadyAuthenticatedException') {
        await amplifySignOut();
        return;
      }
      toast.error("Couldn't start signing in", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, []);

  const signOut = useCallback(async () => {
    if (SIGN_IN_ENABLED) {
      await amplifySignOut();
    }
  }, []);

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
