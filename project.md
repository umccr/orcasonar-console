# OrcaSonar Console

An internal web console for OrcaSonar in the UMCCR portal. Administrators see who asked what, how it was answered and
what it cost; the platform team tries the chat and search API and judges the answers. It is a client of
`https://sonar.<stage>.umccr.org/api/v1` and has no backend of its own.

## Exchanges and conversations

- An **exchange** (`x_…`) is one question and its answer: the question, the answer, the pages it cited, how it ended,
  its tokens, cost and time.
- A **conversation** (`c_…`) is a reader's first question and its follow-ups. Each follow-up sends the
  `conversationId`, and OrcaSonar gives the model the last 6 turns as history.
- An exchange ends one of three ways: **answered**; **not covered** (nothing relevant was found, so no model was
  called); or **failed** (an error code, no answer). A **guardrail intervention** is a separate flag on an answer.

## Who uses it

| Who           | What they do                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Admins        | Review usage and cost, read conversations, find failed and not-covered questions, check interventions |
| Platform team | Ask and search in the playgrounds, and judge the answers                                              |

- The audit pages follow OrcaSonar's `AUDIT_GROUP`: every signed-in user in beta, the `admin` group only in prod.
  Others see a "needs the admin group" message on those pages in prod. The playgrounds need only sign-in.
- Reader emails show in full.
- All usage counts together: the console's questions are not separated from the docs site's.

## Where it lives

| Item    | Value                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------- |
| URL     | `https://portal.umccr.org/orcasonar/` (prod), `https://portal.dev.umccr.org/orcasonar/` (beta)     |
| Sign-in | UMCCR Google account, through the portal's Cognito pool and the shared `orcaui-app-<stage>` client |
| API     | `https://sonar.<stage>.umccr.org/api/v1`, chosen from the page's hostname, never built in          |
| Hosting | Static files behind the portal's CloudFront, deployed by `umccr/frontend-infrastructure-pipelines` |

## Pages

| Page         | Route                                          | API                                                                                      | What it shows                                                                                        |
| ------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Usage        | `/orcasonar/`                                  | `GET /audit/usage`                                                                       | Stat tiles, and one row per reader, for a window                                                     |
| Audit log    | `/orcasonar/audit/`                            | `GET /audit/conversations`; `GET /audit/exchanges`                                       | Conversations with their totals; each expands to its exchanges. A toggle shows the flat exchange log |
| Conversation | pop-up over the audit log, `?conversation=c_…` | `GET /audit/conversations/{id}`                                                          | The whole conversation, oldest first, with answers, sources, model, tokens, cost and time            |
| Chat         | `/orcasonar/chat/`, `?conversation=c_…`        | `POST /chat` (streamed), `GET /chat/history`, `GET /chat/history/{id}`, `POST /feedback` | A chat thread with each answer's details, and your own past conversations                            |
| Search       | `/orcasonar/search/`                           | `POST /search`, `GET /documents/{id}`                                                    | A thread of searches, each with ranked passages and scores, and a page viewer                        |

## The data

- **Usage:** totals `{people, questions, costUsd}`; per reader `{email, questions, answered, notCovered, failed,
costUsd, inputTokens, outputTokens, lastAt}`. Every reader comes back at once.
- **Conversation row:** `{conversationId, caller {id, email, clientId}, startedAt, lastAt, firstQuestion,
questions, answered, notCovered, failed, sites, inputTokens, outputTokens, guardrailInterventions, costUsd}`, plus
  `total`. The totals cover the window; the pop-up has the whole conversation.
- **Exchange row:** `{at, caller, outcome, errorCode?, question, answerPreview, sites, citations, costUsd,
guardrail, latencyMs, conversationId, exchangeId}`, with no total.
- **Conversation detail:** each exchange adds `answer` (Markdown), `sources [{ref, id, title, url, site, score}]`,
  `modelId` and `usage`.
- **Chat stream:** `meta {exchangeId, conversationId}`, `delta {text}`…, `citations [{ref, id, title, url, site,
snippet, score}]`, then `done {usage, costUsd}`.
- **Your history:** list items `{conversationId, title, startedAt, lastAt, questions}`; each exchange
  `{exchangeId, at, question, answer, citations}`. No tokens or cost, and failed questions are left out.
- **Search:** `{results: [{id, title, url, site, snippet, score}]}`, `topK` 1 to 20.

## Rules the design follows

- **Look:** orca-ui-v2's LIMS console (its DESIGN.md and its Cases page). A white sidebar with a logo tile and a
  light-blue active item; the page title with an icon and an "info" link; a filter card above a table card. The
  table toolbar has an item count, refresh, density and column buttons; headers are sortable; badges are soft pills;
  the footer has rows per page. Dense 13px text, flat surfaces, Signal Blue only for actions, and a dark mode.
- **Status colours:** answered green, not covered amber, failed red; a guardrail intervention is an amber flag.
- **Time:** Melbourne local time, UTC on hover. Windows are UTC, default 7 days, at most 31. Data is kept 30 days.
- **Answers** are Markdown; `[n]` links to the citation whose `ref` is n. Never insert them as raw HTML.
- **Paging:** Usage pages in the browser, with page numbers. The conversation list pages by cursor: rows per page,
  "1–50 of 312", previous and next only. The exchange log has no total.
- **Chat details:** an answer asked in this session shows time to first text and total time (measured by the
  console), tokens and cost (from `done`), and its exchange ID. A conversation reopened from history shows the
  questions, answers and citations only.
- **Playground questions are real:** they count against the user's daily allowance and appear in the audit log.
- **No continuing another reader's conversation** (the API returns 403). "Ask again in Chat" starts a new one with the
  first question.
- **Searches are not recorded or budgeted;** the search thread lives in the browser. "Min score" is a preview only:
  it doesn't change the API.
- **IDs** show shortened, and copy on click.

## States every page handles

Loading (skeletons), an empty window, `401` (session ended), `403` (not in the admin group, prod only),
`429 over-budget` (resets at midnight Melbourne time, per `Retry-After`), `429 throttled`, `503 unavailable`.

## Later, and what each needs from OrcaSonar

| Want                                                      | Needs                                    |
| --------------------------------------------------------- | ---------------------------------------- |
| Thumbs up/down in the audit log                           | Feedback ratings in the audit entries    |
| Questions and cost per day, as a chart                    | A per-day series in `/audit/usage`       |
| Filter by site, client or guardrail; search question text | More query parameters on the audit lists |
| What a search cost                                        | Cost in the `/search` response           |
| A reader's allowance left today                           | The planned `/usage` endpoint            |

## Related repositories

| Repository                                | Role                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `umccr/orcasonar`                         | The API and its contract, `app/schema/openapi.yaml`                  |
| `umccr/frontend-infrastructure-pipelines` | The portal's buckets, CloudFront, `env.js` and this app's pipeline   |
| `umccr/infrastructure`                    | `cognito_aai`: add `/orcasonar/` to `portal_app_paths` before launch |
| `umccr/orca-ui-v2`                        | DESIGN.md, the design system this follows                            |
