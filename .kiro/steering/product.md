# Product: OrcaSonar Console

An internal web console for OrcaSonar (umccr/orcasonar), served in the UMCCR portal at `/orcasonar/`. It is a pure
client of `https://sonar.<stage>.umccr.org/api/v1` and has no backend of its own.

- **Admins** review usage and cost, read conversations, find failed and not-covered questions, check guardrail
  interventions.
- **Platform team** asks and searches in the Chat and Search playgrounds and judges the answers.

The design document is `project.md`; the README covers running, deploying and the portal setup. Read them before
changing behaviour, and keep them in step with what you change.

#[[file:project.md]]

## Rules that are easy to break

- Domain terms: an **exchange** (`x_…`) is one question and answer; a **conversation** (`c_…`) is a first question
  and its follow-ups. An exchange is **answered**, **not covered** or **failed**; a guardrail intervention is a
  separate flag. People are **readers**. Use these words in code, UI text and comments.
- Status colours: answered green (`success`), not covered amber (`warning`), failed red (`destructive`), guardrail an
  amber flag. Signal Blue (`primary`) only for what is active or actionable.
- Times show in Melbourne (`Australia/Melbourne`) with UTC on hover. Audit windows are UTC, default 7 days, at most
  31; data is kept 30 days.
- Answers are Markdown rendered through `components/markdown.tsx`; never insert answer or document HTML with
  `dangerouslySetInnerHTML`. `[n]` links to the citation whose `ref` is n.
- Chat questions are real: they count against the reader's daily allowance and appear in the audit log. Searches are
  not recorded; "min score" filters in the browser only.
- A reader can't continue another reader's conversation (403); "Ask again in Chat" starts a new one.
- Every page handles: loading (skeletons), empty window, `401`, `403` (audit pages in prod), `429 over-budget`,
  `429 throttled`, `503 unavailable`. Use `ErrorState`/`AuditForbidden` and `describeError` rather than new copy.
- IDs show shortened and copy on click (`CopyId`).
- UI copy is plain, sentence-case English addressed to the reader, as in `lib/describe-error.ts`.
