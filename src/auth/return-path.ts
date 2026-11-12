const KEY = 'orcasonar-console.return-path';

/** Notes the page the reader is on, before Cognito's sign-in takes them away and returns them to the app's root. */
export const keepReturnPath = (): void => {
  try {
    const { pathname, search, hash } = window.location;
    sessionStorage.setItem(KEY, `${pathname}${search}${hash}`);
  } catch {
    // They come back to the root instead.
  }
};

/** Goes back to the page noted before signing in, if it was one of this app's. */
export const takeReturnPath = (): void => {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (path?.startsWith(import.meta.env.BASE_URL) && !path.startsWith('//')) {
      window.history.replaceState(null, '', path);
    }
  } catch {
    // Stay where Cognito left the reader.
  }
};
