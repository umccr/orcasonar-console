import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { mockFetch } from './fetch-mock';

// Requests go to a fixed host, so they have absolute URLs, and through the mock, before any module makes a client.
window.config = { VITE_ORCASONAR_URL: 'https://sonar.test' };
globalThis.fetch = mockFetch;

// jsdom has no matchMedia or ResizeObserver, which the theme and the tables' scroll areas use.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;

// Nor element scrolling or the animations API, which the chat thread, the drawers and Base UI's scroll areas use.
for (const [name, stub] of [
  ['scrollTo', () => undefined],
  ['scrollIntoView', () => undefined],
  ['getAnimations', () => []],
] as const) {
  if (!(name in Element.prototype)) {
    Object.defineProperty(Element.prototype, name, { value: stub, writable: true });
  }
}

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
