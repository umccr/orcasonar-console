import { lazy } from 'react';

/** Each page in its own chunk, loaded when first opened. */
export const UsagePage = lazy(() =>
  import('@/features/usage/UsagePage').then((module) => ({ default: module.UsagePage }))
);
export const AuditLogPage = lazy(() =>
  import('@/features/audit/AuditLogPage').then((module) => ({ default: module.AuditLogPage }))
);
export const ChatPage = lazy(() =>
  import('@/features/chat/ChatPage').then((module) => ({ default: module.ChatPage }))
);
export const SearchPage = lazy(() =>
  import('@/features/search/SearchPage').then((module) => ({ default: module.SearchPage }))
);
