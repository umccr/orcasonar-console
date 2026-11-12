import type { ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';
import type { AuditListParams } from '@/api/queries';
import type { Density } from '@/components/data-table';
import type { DataGridFeatures } from '@/components/reui/data-grid/data-grid';

/** What the audit page hands each of its two tables. */
export interface AuditTableProps {
  readonly params: Omit<AuditListParams, 'cursor'>;
  readonly onOpen: (conversationId: string, exchangeId?: string) => void;
  readonly density: Density;
  /** The toolbar's controls, which need the table for its column menu. */
  readonly toolbar: <TData extends object>(table: Table<DataGridFeatures, TData>) => ReactNode;
  readonly onPageSize: (size: number) => void;
}

/** What starts a list again at its first page: a new window, filter or page size. */
export const resetKeyOf = (params: Omit<AuditListParams, 'cursor'>): string =>
  JSON.stringify([
    params.window.from,
    params.window.to,
    params.caller,
    params.outcome,
    params.limit,
  ]);
