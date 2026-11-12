# OrcaSonar Console

An internal web console for [OrcaSonar](https://github.com/umccr/orcasonar), served in the UMCCR portal at
`https://portal.umccr.org/orcasonar/` (beta: `https://portal.dev.umccr.org/orcasonar/`). Administrators see who
asked OrcaSonar what, how it was answered and what it cost; the platform team tries its chat and search and judges
the answers. It is a client of OrcaSonar's API and has no backend of its own. [project.md](project.md) is the design.

| Page      | Route                | What it shows                                                                                     |
| --------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| Usage     | `/orcasonar/`        | The window's people, questions, cost and answered share, and each reader's numbers                |
| Audit log | `/orcasonar/audit/`  | Conversations with their totals, each expanding to its exchanges; a toggle shows the exchange log |
| (drawer)  | `?conversation=c_…`  | One conversation from the audit log: each answer, its sources, model, tokens, cost and time       |
| Chat      | `/orcasonar/chat/`   | A chat with OrcaSonar, with each answer's timings, tokens and cost, and your history of 30 days   |
| Search    | `/orcasonar/search/` | A thread of searches, each with its ranked passages and scores, and a viewer for the pages        |

The audit pages follow OrcaSonar's audit group: anyone signed in, in beta; the portal's `admin` group, in prod.
Questions asked in Chat are real: they count against the asker's daily allowance and appear in the audit log.
Searches are not recorded.

## Running it locally

You need Node.js 24 and pnpm 10 (`corepack enable`). Then `make install`, and one of two ways to run it.

**Against OrcaSonar dev**, signed in, as orca-ui-v2's `make start` runs against OrcaBus dev:

```sh
aws sso login --profile dev   # start.sh reads dev's Cognito settings from SSM
make start                    # http://localhost:3000/orcasonar/
```

`make start` regenerates the API types from dev's contract, then runs [start.sh](start.sh). That signs you in with
your UMCCR Google account through the dev pool's `localhost` Cognito client, whose callback is
`http://localhost:3000/orcasonar/`, and the dev server sends `/api` on to `https://sonar.dev.umccr.org`, so the
browser never asks OrcaSonar's CORS, which allows only the deployed hosts. Port 3000 is the one the localhost client
returns to, as for orca-ui-v2, so the two can't run at once. `AWS_PROFILE` picks another profile than `dev`.

What you ask is real there: it counts against your daily allowance in dev and shows in dev's audit log. Signing in
needs `/orcasonar/` in `portal_app_paths` of umccr/infrastructure's `cognito_aai`, applied in dev, and OrcaSonar beta
to accept the localhost client's tokens.

**Against the in-memory API**, without signing in, with a checkout of umccr/orcasonar beside this one:

```sh
make local-api     # in one terminal: OrcaSonar's in-memory API on http://127.0.0.1:8787
make start-local   # in another: the console on http://localhost:3000/orcasonar/
```

The local API answers every request as its own reader, `local-reader@example.org`, in the audit group, with scripted
answers, and it holds no documents. `PORT` picks another port. `ORCASONAR_API` points the dev server at another API
in either way.

## How it fits the portal

The console is one of the portal's apps, like orca-ui-v2: a single-page app built to `build/` with Vite's base path
`/orcasonar/`, synced to its own bucket behind the portal's CloudFront by
[frontend-infrastructure-pipelines](https://github.com/umccr/frontend-infrastructure-pipelines), where it is
`ORCASONAR_APP` and `OrcaSonarConsoleAppPipeline`. It runs in beta and prod only, as OrcaSonar does.

- **Sign-in** is the portal's Cognito pool and the shared OrcaUI app client, whose settings the pipeline writes into
  `/orcasonar/env.js` as `window.config`: `VITE_REGION`, `VITE_COG_USER_POOL_ID`, `VITE_COG_APP_CLIENT_ID` and
  `VITE_OAUTH_DOMAIN`, read key by key. On a deployed host, a missing one is named on the page. On the same portal
  host, a reader signed in to one portal app is signed in to all of them. Cognito returns readers to
  `https://<portal host>/orcasonar/`, registered by `/orcasonar/` in `portal_app_paths` of umccr/infrastructure's
  `cognito_aai`.
- **The API** is chosen from the page's host: `sonar.dev.umccr.org` behind `portal.dev.umccr.org`,
  `sonar.prod.umccr.org` behind `portal.umccr.org`. `VITE_ORCASONAR_URL`, in `env.js` or the environment, overrides
  it. Staging has no OrcaSonar.
- **One host per stage.** OrcaSonar's CORS and the Cognito callbacks name `portal.dev.umccr.org` and
  `portal.umccr.org`, so a page opened on `orcaui.*` or `portal.prod.umccr.org` moves there first, keeping its path,
  query and hash, as orca-ui-v2 does.
- **The ID token** goes to OrcaSonar as `Authorization: Bearer <token>`, as its authorizer expects.

### Deploying

A merge to `main` releases the console: `OrcaSonarConsoleAppCICDPipeline` builds it once, deploys it to beta, and,
after an approval, to prod. Before an environment first gets it:

1. `/orcasonar/` is in `portal_app_paths` of `cognito_aai`, applied in that environment's workspace, or sign-in
   fails with `redirect_mismatch`.
2. OrcaSonar there has `/audit/conversations` and `/chat/history`.
3. The portal's hosting has the console's bucket and `/orcasonar/*` behaviour (`ORCASONAR_APP`, deployed by the
   portal infrastructure pipeline), and `OrcaSonarConsoleAppPipeline` is deployed from the toolchain account.

[docs/orcasonar-console](https://github.com/umccr/frontend-infrastructure-pipelines/blob/main/docs/orcasonar-console/README.md)
in frontend-infrastructure-pipelines has the steps.

## Working on it

| Command          | What it does                                                           |
| ---------------- | ---------------------------------------------------------------------- |
| `make check`     | Types, lint, formatting and tests, as the pull request checks run them |
| `make build`     | The production build, in `build/`                                      |
| `make api-types` | `src/api/schema.d.ts` from OrcaSonar dev's contract                    |

`make api-types` reads `https://sonar.dev.umccr.org/schema/openapi.json`; `ORCASONAR_OPENAPI` names another file or
URL, such as `../orcasonar/app/schema/openapi.yaml` for API changes not yet in dev. `make start` runs it too. Commit
the result, so the checks and the build don't depend on dev.

```text
src/
  api/          the typed client, the chat stream reader, and the queries each page makes
  auth/         sign-in through Amplify, and running without it locally
  components/   the console's shared pieces: sidebar, page header, badges, tables' toolbars
    ui/         shadcn/ui components (Base UI, base-nova style), from the shadcn registry
    reui/       ReUI's data grid and badge, from the @reui registry
  features/     one folder per page: usage, audit, chat, search
  lib/          formatting, the stage and its API, windows, and other helpers
```

The look follows orca-ui-v2's DESIGN.md: Inter at 13px, Signal Blue for what is active, one set of status colours,
and a dark mode of its own. Its tokens are the CSS variables in `src/styles/index.css`.

Components in `ui/` and `reui/` come from their registries and are not linted. Add one with the shadcn CLI, as
`pnpm dlx shadcn@latest add tabs` or `pnpm dlx shadcn@latest add @reui/<name>`, rather than writing your own. They are
used as they come, but for one change: `ui/sonner.tsx` takes its theme from the console rather than `next-themes`.
Of ReUI's data grid, only the parts the console uses are kept.
