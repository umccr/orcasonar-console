import { useMemo, useState } from 'react';
import { useTable, type ColumnDef, type ColumnVisibilityState } from '@tanstack/react-table';
import { ShieldAlert } from 'lucide-react';
import { useAuditExchanges } from '@/api/queries';
import type { AuditRow } from '@/api/types';
import { CopyId } from '@/components/copy-id';
import { CursorPagination, TableToolbar } from '@/components/data-table';
import { NUMERIC_COLUMN } from '@/lib/table';
import { ErrorState } from '@/components/error-state';
import { OutcomeBadge } from '@/components/outcome-badge';
import { ReaderCell } from '@/components/reader-cell';
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { TimeText } from '@/components/time-text';
import { Card } from '@/components/ui/card';
import { useCursorPages } from '@/hooks/use-cursor-pages';
import { formatDuration, formatInteger, formatUsd } from '@/lib/format';
import { resetKeyOf, type AuditTableProps } from './audit-table';

const columns: ColumnDef<DataGridFeatures, AuditRow>[] = [
  {
    id: 'at',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Time' />,
    cell: ({ row }) => <TimeText value={row.original.at} className='whitespace-nowrap' />,
    size: 110,
  },
  {
    id: 'ids',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Exchange' />,
    cell: ({ row }) => (
      <div className='grid gap-0.5'>
        <CopyId id={row.original.exchangeId} className='text-primary hover:text-primary/80' />
        <CopyId id={row.original.conversationId} className='text-[11px]' />
      </div>
    ),
    size: 130,
  },
  {
    id: 'reader',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Reader' />,
    cell: ({ row }) => <ReaderCell email={row.original.caller.email} id={row.original.caller.id} />,
    size: 200,
  },
  {
    id: 'question',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Question' />,
    cell: ({ row }) => (
      <div className='flex min-w-0 items-center gap-1.5'>
        {row.original.guardrail === 'intervened' && (
          <ShieldAlert
            className='size-4 shrink-0 text-warning'
            aria-label='The guardrail intervened'
          />
        )}
        <span className='truncate font-medium text-foreground' title={row.original.question}>
          {row.original.question}
        </span>
      </div>
    ),
    size: 265,
  },
  {
    id: 'outcome',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Outcome' />,
    cell: ({ row }) => (
      <OutcomeBadge outcome={row.original.outcome}>
        {row.original.errorCode && ` · ${row.original.errorCode}`}
      </OutcomeBadge>
    ),
    size: 125,
  },
  {
    id: 'citations',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Sources' />,
    cell: ({ row }) => formatInteger(row.original.citations),
    size: 75,
    meta: NUMERIC_COLUMN,
  },
  {
    id: 'latency',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Took' />,
    cell: ({ row }) =>
      row.original.latencyMs === undefined ? '–' : formatDuration(row.original.latencyMs),
    size: 75,
    meta: NUMERIC_COLUMN,
  },
  {
    id: 'cost',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Cost' />,
    cell: ({ row }) => (
      <span className='font-medium text-foreground'>
        {row.original.costUsd === undefined ? '–' : formatUsd(row.original.costUsd, 4)}
      </span>
    ),
    size: 85,
    meta: NUMERIC_COLUMN,
  },
];

/** The audit log one exchange to a row, newest first. The API gives no total for it. */
export function ExchangesTable({ params, onOpen, density, toolbar, onPageSize }: AuditTableProps) {
  const pages = useCursorPages(resetKeyOf(params));
  const query = useAuditExchanges({ ...params, cursor: pages.cursor });
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: items,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (exchange: AuditRow) => exchange.exchangeId,
    manualPagination: true,
    enableSorting: false,
  });

  return (
    <DataGrid
      table={table}
      recordCount={items.length}
      isLoading={query.isPending}
      loadingMode='skeleton'
      onRowClick={(exchange) => onOpen(exchange.conversationId, exchange.exchangeId)}
      emptyMessage='No exchanges in this window.'
      tableLayout={{
        dense: density === 'compact',
        headerBackground: true,
        headerBorder: true,
        rowBorder: true,
        columnsVisibility: true,
      }}
    >
      <Card className='gap-0 py-0'>
        <TableToolbar summary={<span className='font-medium text-foreground'>Exchanges</span>}>
          {toolbar(table)}
        </TableToolbar>
        {query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <DataGridContainer>
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
            <CursorPagination
              page={pages.page}
              pageSize={params.limit}
              shown={items.length}
              hasNext={query.data?.nextCursor !== undefined}
              onPrevious={pages.previous}
              onNext={() => {
                if (query.data?.nextCursor) {
                  pages.next(query.data.nextCursor);
                }
              }}
              onPageSize={onPageSize}
              disabled={query.isFetching}
            />
          </>
        )}
      </Card>
    </DataGrid>
  );
}
