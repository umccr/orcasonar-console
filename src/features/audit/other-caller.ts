import type { AuditCaller } from '@/api/types';

/**
 * Who asked an exchange, when that is not who asked the conversation's first question. Only its owner can continue a
 * conversation, so this is someone whose follow-up was refused: the audit log keeps it under the conversation it named.
 */
export const otherCaller = (
  exchange: { readonly caller: AuditCaller },
  first: { readonly caller: AuditCaller } | undefined
): AuditCaller | undefined =>
  first !== undefined && exchange.caller.id !== first.caller.id ? exchange.caller : undefined;

/** A caller as the audit log names them: their email, or their Cognito `sub` when the token had no email. */
export const callerName = (caller: AuditCaller): string => caller.email ?? caller.id;
