# Structure and conventions

## Layout

```text
src/
  main.tsx        moves non-canonical portal hosts (orcaui.*, portal.prod.*) to the canonical one, then renders App
  app/            App (providers and the sign-in gate), router, layout, lazy pages, the QueryClient, full-page states
  api/            client.ts (openapi-fetch + token), errors.ts (ApiError), queries.ts (every useQuery/useMutation),
                  chat-stream.ts (SSE), types.ts (schema aliases), api-status.ts, schema.d.ts (generated)
  auth/           Amplify config and idToken (session.ts), AuthProvider and useAuth, the return path after sign-in
  components/     the console's shared pieces: sidebar, page header, filters, table toolbar, badges, Markdown, errors
    ui/           shadcn/ui components, from the registry (not linted, not hand-written)
    reui/         ReUI data grid and badge, from the @reui registry (only the parts used)
  features/       one folder per page: usage, audit, chat, search; pages, their sheets and page-local state
  hooks/          shared hooks: audit window, cursor paging, stored choices
  lib/            pure helpers: format, stage and API base URL, env, windows, outcomes, error text, table meta
  styles/         index.css: Tailwind, theme tokens, light and dark palettes
  test/           setup.ts (jsdom stubs, fetch mock), render.tsx (renderPage), fetch-mock.ts (answer, json, sse)
```

Imports use the `@/` alias for `src/`. Keep `lib/` free of React where it can be, so it stays easy to unit-test.

## Adding things

- **A page:** a folder under `src/features/<page>/` exporting a named `XxxPage`; add it to `app/lazy-pages.tsx`,
  `app/router.tsx`, the sidebar (`components/app-sidebar.tsx`), the README's page table and `project.md`.
- **An API call:** a hook in `src/api/queries.ts` using `unwrap(api.GET(...))` (or `expectOk` for empty
  responses), passing `signal`, with a query key starting with its area (`['audit', ...]`, `['history', ...]`).
  Don't call `fetch` directly; `streamChat` is the one exception, for SSE.
- **A UI component:** check `components/ui` first; add missing ones with `pnpm dlx shadcn@latest add <name>` or
  `pnpm dlx shadcn@latest add @reui/<name>`, and use them as they come. Console-specific components go in
  `src/components/`, built from those.
- **A setting:** read it with `readEnv('VITE_…')` from `lib/env.ts`, which prefers `window.config` (`env.js`) and
  falls back to Vite env. Never build stage hosts or IDs into code beyond `lib/stage.ts`.

## Code style

- Function components, named exports. Small helpers as `const` arrow functions; components as `function`.
- Types with `interface`/`type`, `readonly` fields for data, string unions instead of enums, `satisfies` for
  constant tables. Narrow `unknown` errors with `isApiError` and type guards rather than casts.
- Server state in TanStack Query; local UI state in `useState`/`useReducer` (see `features/chat/chat-state.ts`);
  URL state (window, filters, `?conversation=`) in search params; remembered choices with `useStoredChoice`.
- Format numbers, money, durations and times only through `lib/format.ts` and `TimeText`.
- Errors: let queries throw `ApiError`; the QueryClient reports API status and ends the session on `401`. Pages show
  `ErrorState` (or `AuditForbidden` for `403`). Retries are only for network and 5xx.
- Comments are short JSDoc in plain sentences saying what a thing is for and why, in the README's voice. Don't add
  comments that restate the code.

## Tests

- Colocated `*.test.ts(x)` next to the code. Pure logic (reducers, formatters, stage) gets unit tests; pages get
  render tests with `renderPage(<XxxPage />, path)` from `@/test/render`.
- Stub the API with `answer((request) => ...)`, `json(body, status)` and `sse(events)` from `@/test/fetch-mock`;
  match requests with `pathOf(request)` and inspect `requests`. Don't mock modules for the API.
- Query by role and accessible name (`findByRole`, `getByRole`) and drive the UI with the returned `user`.
- Requests in tests go to `https://sonar.test` (set in `test/setup.ts`). Don't add tests unless asked, but keep the
  existing ones passing.
