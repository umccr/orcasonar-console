import { createContext, useContext } from 'react';

/** Who is signed in, from their ID token. */
export interface Reader {
  readonly email?: string;
  readonly name?: string;
  readonly groups: readonly string[];
}

export type AuthState =
  | { readonly status: 'loading' }
  | { readonly status: 'signed-out'; readonly reason?: 'expired' | 'failed' }
  | { readonly status: 'signed-in'; readonly reader: Reader }
  /** Running against the local API, which answers as its own reader: nobody signs in. */
  | { readonly status: 'local'; readonly reader: Reader };

export interface AuthContextValue {
  readonly state: AuthState;
  readonly signIn: () => Promise<void>;
  readonly signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth needs an <AuthProvider> above it.');
  }
  return value;
};

/** The signed-in reader, or the local one. */
export const useReader = (): Reader | undefined => {
  const { state } = useAuth();
  return state.status === 'signed-in' || state.status === 'local' ? state.reader : undefined;
};
