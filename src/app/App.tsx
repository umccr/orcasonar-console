import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { useAuth } from '@/auth/auth-context';
import { AuthProvider } from '@/auth/AuthProvider';
import { takeReturnPath } from '@/auth/return-path';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MISSING_SIGN_IN_SETTINGS, SIGN_IN_ENABLED } from '@/auth/session';
import { API_BASE_URL, STAGE } from '@/lib/stage';
import { MissingSignInSettings, SignInPage, SigningIn, UnsupportedHost } from './pages';
import { queryClient } from './query-client';
import { createAppRouter } from './router';

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delay={300}>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </TooltipProvider>
        <Toaster position='top-right' />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

let router: ReturnType<typeof createAppRouter> | undefined;

/**
 * Drops what a reader's session left in memory when it ends, by signing out, a `401` or a failed token refresh: the
 * cache of their audit and history queries, and the router with their place in the console. Signing in again goes
 * through Cognito and reloads the page, but the next reader's console doesn't rely on that.
 */
const endConsoleSession = (): void => {
  queryClient.clear();
  router?.dispose();
  router = undefined;
};

/** The console once the reader is signed in; until then, signing in. */
function Gate() {
  const { state } = useAuth();
  const signedOut = state.status === 'signed-out';
  useEffect(() => {
    // After the console has unmounted, so nothing still reads the cache or the router.
    if (signedOut) {
      endConsoleSession();
    }
  }, [signedOut]);
  if (API_BASE_URL === undefined) {
    return <UnsupportedHost />;
  }
  // A deployed console that can't sign in would only collect 401s; say what env.js lacks instead.
  if (STAGE !== 'local' && !SIGN_IN_ENABLED) {
    return <MissingSignInSettings names={MISSING_SIGN_IN_SETTINGS} />;
  }
  switch (state.status) {
    case 'loading':
      return <SigningIn />;
    case 'signed-out':
      return <SignInPage reason={state.reason} />;
    default:
      return <Console />;
  }
}

function Console() {
  // Made once a session, after signing in, from the page the reader asked for before Cognito sent them to the root.
  router ??= (takeReturnPath(), createAppRouter());
  return <RouterProvider router={router} />;
}
