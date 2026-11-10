import { useMemo, useState } from 'react';
import {
  useTable,
  type ColumnDef,
  type ExpandedState,
  type ColumnVisibilityState,
} from '@tanstack/react-table';
import { ExternalLink } from 'lucide-react';
import { useAuditConversation, useAuditConversations } from '@/api/queries';
import type { AuditConversation } from '@/api/types';
import { ErrorState } from '@/components/error-state';
import { GuardrailBadge, OutcomeBadge } from '@/components/outcome-badge';
import { ReaderCell } from '@/components/reader-cell';
import { Badge } from '@/components/reui/badge';
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable, DataGridTableRowExpand } from '@/components/reui/data-grid/data-grid-table';
import { SiteChip } from '@/components/score-bar';
import { TimeText } from '@/components/time-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CursorPagination, TableToolbar } from '@/components/data-table';
import { NUMERIC_COLUMN } from '@/lib/table';
import { useCursorPages } from '@/hooks/use-cursor-pages';
import { formatCompact, formatDuration, formatInteger, formatUsd, plural } from '@/lib/format';
import { resetKeyOf, type AuditTableProps } from './audit-table';

/** The audit log by conversation, most recently active first, each with what its exchanges in the window add up to. */
export function ConversationsTable({
  params,
  onOpen,
  density,
  toolbar,
  onPageSize,
}: AuditTableProps) {
  const pages = useCursorPages(resetKeyOf(params));
  const query = useAuditConversations({ ...params, cursor: pages.cursor });
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({ sites: false });
  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const columns = useMemo(() => conversationColumns(onOpen), [onOpen]);

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: items,
    state: { expanded, columnVisibility },
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (conversation: AuditConversation) => conversation.conversationId,
    getRowCanExpand: () => true,
    manualPagination: true,
    enableSorting: false,
  });

  return (
    <DataGrid
      table={table}
      recordCount={items.length}
      isLoading={query.isPending}
      loadingMode='skeleton'
      onRowClick={(conversation) => onOpen(conversation.conversationId)}
      emptyMessage='No conversations in this window.'
      tableLayout={{
        dense: density === 'compact',
        headerBackground: true,
        headerBorder: true,
        rowBorder: true,
        columnsVisibility: true,
      }}
    >
      <Card className='gap-0 py-0'>
        <TableToolbar
          summary={
            <span className='font-medium text-foreground'>
              {query.data ? plural(query.data.total, 'conversation') : 'Conversations'}
            </span>
          }
        >
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
              total={query.data?.total}
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

const conversationColumns = (
  onOpen: (conversationId: string) => void
): ColumnDef<DataGridFeatures, AuditConversation>[] => [
  {
    id: 'expand',
    header: () => null,
    cell: ({ row }) => <DataGridTableRowExpand row={row} />,
    size: 36,
    enableHiding: false,
    meta: {
      expandedContent: (conversation: AuditConversation) => (
        <ConversationPreview
          conversationId={conversation.conversationId}
          onOpen={() => onOpen(conversation.conversationId)}
        />
      ),
    },
  },
  {
    id: 'lastAt',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Last activity' />,
    cell: ({ row }) => <TimeText value={row.original.lastAt} className='whitespace-nowrap' />,
    size: 110,
  },
  {
    id: 'reader',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Reader' />,
    cell: ({ row }) => <ReaderCell email={row.original.caller.email} id={row.original.caller.id} />,
    size: 200,
  },
  {
    id: 'firstQuestion',
    header: ({ column }) => <DataGridColumnHeader column={column} title='First question' />,
    cell: ({ row }) => (
      <div className='flex min-w-0 items-center gap-2'>
        <span className='truncate font-medium text-foreground' title={row.original.firstQuestion}>
          {row.original.firstQuestion}
        </span>
        {row.original.questions > 1 && (
          <Badge variant='secondary' radius='full' size='sm' title='Follow-ups'>
            +{row.original.questions - 1}
          </Badge>
        )}
      </div>
    ),
    size: 270,
  },
  {
    id: 'questions',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Questions' />,
    cell: ({ row }) => formatInteger(row.original.questions),
    size: 85,
    meta: NUMERIC_COLUMN,
  },
  {
    id: 'outcomes',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Outcomes' />,
    cell: ({ row }) => {
      const conversation = row.original;
      return (
        <div className='flex flex-wrap gap-1'>
          {conversation.answered > 0 && (
            <OutcomeBadge outcome='answered' count={conversation.answered} />
          )}
          {conversation.notCovered > 0 && (
            <OutcomeBadge outcome='not-covered' count={conversation.notCovered} />
          )}
          {conversation.failed > 0 && <OutcomeBadge outcome='failed' count={conversation.failed} />}
          {conversation.guardrailInterventions > 0 && (
            <GuardrailBadge count={conversation.guardrailInterventions} />
          )}
        </div>
      );
    },
    size: 190,
  },
  {
    id: 'sites',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Sites' />,
    cell: ({ row }) =>
      row.original.sites.length === 0 ? (
        <span className='text-muted-foreground'>All</span>
      ) : (
        <div className='flex flex-wrap gap-1'>
          {row.original.sites.map((site) => (
            <SiteChip key={site} site={site} />
          ))}
        </div>
      ),
    size: 140,
  },
  {
    id: 'tokens',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Tokens' />,
    cell: ({ row }) => (
      <span
        className='whitespace-nowrap'
        title={`${formatInteger(row.original.inputTokens)} in, ${formatInteger(row.original.outputTokens)} out`}
      >
        {formatCompact(row.original.inputTokens)} in · {formatCompact(row.original.outputTokens)}{' '}
        out
      </span>
    ),
    size: 125,
    meta: NUMERIC_COLUMN,
  },
  {
    id: 'cost',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Cost' />,
    cell: ({ row }) => (
      <span className='font-medium text-foreground'>{formatUsd(row.original.costUsd, 4)}</span>
    ),
    size: 85,
    meta: NUMERIC_COLUMN,
  },
];

/** A conversation's exchanges, under its row: every one of them, inside the window or not. */
function ConversationPreview({
  conversationId,
  onOpen,
}: {
  conversationId: string;
  onOpen: () => void;
}) {
  const query = useAuditConversation(conversationId);
  return (
    <div className='space-y-2 bg-muted/40 py-3 ps-12 pe-4'>
      {query.isPending ? (
        <div className='space-y-1.5'>
          <Skeleton className='h-7 w-full' />
          <Skeleton className='h-7 w-3/4' />
        </div>
      ) : query.error ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          className='p-2 md:p-4'
        />
      ) : (
        <ul className='divide-y overflow-hidden rounded-lg border bg-card'>
          {query.data.exchanges.map((exchange) => (
            <li
              key={exchange.exchangeId}
              className='grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto_5rem_4.5rem_5rem]'
            >
              <TimeText
                value={exchange.at}
                format='seconds'
                className='text-xs text-muted-foreground tabular-nums'
              />
              <span className='truncate' title={exchange.question}>
                {exchange.question}
              </span>
              <OutcomeBadge outcome={exchange.outcome} />
              <span className='hidden text-end text-xs text-muted-foreground sm:block'>
                {plural(exchange.sources?.length ?? 0, 'source')}
              </span>
              <span className='hidden text-end text-xs text-muted-foreground tabular-nums sm:block'>
                {exchange.latencyMs === undefined ? '–' : formatDuration(exchange.latencyMs)}
              </span>
              <span className='hidden text-end text-xs font-medium tabular-nums sm:block'>
                {exchange.costUsd === undefined ? '–' : formatUsd(exchange.costUsd, 4)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button variant='link' size='sm' className='h-auto px-0' onClick={onOpen}>
        <ExternalLink />
        Open the conversation
      </Button>
    </div>
  );
}
