import type { components } from './schema';

type Schemas = components['schemas'];

export type AuditCaller = Schemas['AuditCaller'];
export type AuditConversation = Schemas['AuditConversation'];
export type AuditExchange = Schemas['AuditExchange'];
export type AuditOutcome = Schemas['AuditOutcome'];
export type AuditRow = Schemas['AuditRow'];
export type AuditUsage = Schemas['AuditUsage'];
export type ChatRequest = Schemas['ChatRequest'];
export type Citation = Schemas['Citation'];
export type CitedSource = Schemas['CitedSource'];
export type DocumentPage = Schemas['Document'];
export type HistoryConversation = Schemas['HistoryConversation'];
export type HistoryExchange = Schemas['HistoryExchange'];
export type SearchResult = Schemas['Source'];
export type Usage = Schemas['Usage'];
export type UsageCaller = AuditUsage['callers'][number];

/**
 * A page an answer cites, live or saved. `ref` is the number the answer cites it by, as in `[2]`. Saved answers keep
 * no snippet, and those saved before titles were kept have no title or site either.
 */
export interface AnswerSource {
  readonly ref: number;
  readonly id: string;
  readonly title?: string;
  readonly url: string;
  readonly site?: string;
  readonly score: number;
  readonly snippet?: string;
}

/** Sources as an answer cites them; an old saved source without `ref` takes its place in the list. */
export const toAnswerSources = (
  sources: readonly (Citation | CitedSource)[] | undefined
): AnswerSource[] =>
  (sources ?? []).map((source, index) => ({ ...source, ref: source.ref ?? index + 1 }));
