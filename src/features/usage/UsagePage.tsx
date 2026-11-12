import { useMemo, useState } from 'react';
import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type ColumnVisibilityState,
} from '@tanstack/react-table';
import { ChartColumn, Search } from 'lucide-react';
import { Link } from 'react-router';
import { useAuditUsage } from '@/api/queries';
import type { UsageCaller } from '@/api/types';
import {
  ColumnsMenu,
  DensityToggle,
  RefreshButton,
  TableToolbar,
  type Density,
} from '@/components/data-table';
import { NUMERIC_COLUMN } from '@/lib/table';
import { AuditForbidden, ErrorState } from '@/components/error-state';
import { isForbidden } from '@/lib/describe-error';
import { WindowSelect } from '@/components/filters';
import { PageHeader } from '@/components/page-header';
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { OutcomeBar, StatTile } from '@/components/stat-tile';
import { TimeText } from '@/components/time-text';
import { Card } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { useAuditWindow } from '@/hooks/use-audit-window';
import { useStoredChoice } from '@/hooks/use-stored-choice';
import { formatDateTime, formatInteger, formatPercent, formatUsd, plural } from '@/lib/format';
import { cn } from '@/lib/utils';

const DENSITIES = ['comfortable', 'compact'] as const satisfies readonly Density[];
const DAY_MS = 86_400_000;

const integerCell = (value: number) => formatInteger(value);

const columns: ColumnDef<DataGridFeatures, UsageCaller>[] = [
  {
    id: 'reader',
    accessorFn: (caller) => caller.email ?? caller.id,
    header: ({ column }) => <DataGridColumnHeader column={column} title='Reader' />,
    cell: ({ row }) => {
      const caller = row.original;
      return (
        <Link
          to={`/audit?caller=${encodeURIComponent(caller.email ?? caller.id)}`}
          className='font-medium text-primary hover:underline'
          title={`See ${caller.email ?? caller.id}'s conversations in the audit log`}
        >
          {caller.email ?? caller.id}
        </Link>
      );
    },
    size: 240,
    enableHiding: false,
  },
  {
    accessorKey: 'questions',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Questions' />,
    cell: ({ row }) => integerCell(row.original.questions),
    size: 100,
    meta: NUMERIC_COLUMN,
  },
  {
    accessorKey: 'answered',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Answered' />,
    cell: ({ row }) => integerCell(row.original.answered),
    size: 100,
    meta: NUMERIC_COLUMN,
  },
  {
    accessorKey: 'notCovered',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Not covered' />,
    cell: ({ row }) => integerCell(row.original.notCovered),
    size: 110,
    meta: NUMERIC_COLUMN,
  },
  {
    accessorKey: 'failed',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Failed' />,
    cell: ({ row }) => (
      <span className={cn(row.original.failed > 0 && 'font-semibold text-destructive')}>
        {integerCell(row.original.failed)}
      </span>
    ),
    size: 80,
    meta: NUMERIC_COLUMN,
  },
  {
    accessorKey: 'inputTokens',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Input tokens' />,
    cell: ({ row }) => integerCell(row.original.inputTokens),
    size: 115,
    meta: NUMERIC_COLUMN,
  },
  {
    accessorKey: 'outputTokens',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Output tokens' />,
    cell: ({ row }) => integerCell(row.original.outputTokens),
    size: 120,
    meta: NUMERIC_COLUMN,
  },
  {
    accessorKey: 'costUsd',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Cost (US$)' />,
    cell: ({ row }) => (
      <span className='font-medium text-foreground'>{formatUsd(row.original.costUsd, 4)}</span>
    ),
    size: 105,
    meta: NUMERIC_COLUMN,
  },
  {
    accessorKey: 'lastAt',
    header: ({ column }) => <DataGridColumnHeader column={column} title='Last asked' />,
    cell: ({ row }) => (
      <TimeText value={row.original.lastAt} format='relative' className='text-muted-foreground' />
    ),
    size: 105,
    meta: { ...NUMERIC_COLUMN, cellClassName: 'text-end' },
  },
];

export function UsagePage() {
  const { range, window, setRange, refresh } = useAuditWindow();
  const usage = useAuditUsage(window);
  const [filter, setFilter] = useState('');
  const [density, setDensity] = useStoredChoice<Density>('usage.density', DENSITIES, 'comfortable');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'questions', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  const callers = useMemo(() => usage.data?.callers ?? [], [usage.data]);
  const needle = filter.trim().toLowerCase();
  const shown = useMemo(
    () =>
      needle === ''
        ? callers
        : callers.filter((caller) => (caller.email ?? caller.id).toLowerCase().includes(needle)),
    [callers, needle]
  );

  const sums = useMemo(
    () =>
      callers.reduce(
        (sum, caller) => ({
          answered: sum.answered + caller.answered,
          notCovered: sum.notCovered + caller.notCovered,
          failed: sum.failed + caller.failed,
        }),
        { answered: 0, notCovered: 0, failed: 0 }
      ),
    [callers]
  );
  const totals = usage.data?.totals;
  const activeLastDay = callers.filter(
    (caller) => Date.parse(window.to) - Date.parse(caller.lastAt) < DAY_MS
  ).length;

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: shown,
    state: { sorting, pagination, columnVisibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (caller: UsageCaller) => caller.id,
  });

  const header = (
    <PageHeader
      icon={ChartColumn}
      title='Usage'
      info={
        <>
          <p>
            How much OrcaSonar was used in the window: each reader&apos;s questions, how they ended,
            the tokens they took and what they cost.
          </p>
          <p>
            Questions asked on the docs site and in this console count together. The audit log keeps
            30 days.
          </p>
        </>
      }
    />
  );

  if (isForbidden(usage.error)) {
    return (
      <>
        {header}
        <AuditForbidden />
      </>
    );
  }

  const loading = usage.isPending;
  return (
    <>
      {header}
      <div className='space-y-4 px-4 pb-8 sm:px-6'>
        <Card className='flex-row flex-wrap items-center gap-3 px-3 py-3'>
          <InputGroup className='h-9 max-w-md flex-1 bg-card'>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder='Filter readers by email…'
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              aria-label='Filter readers by email'
            />
          </InputGroup>
          <div className='ms-auto flex items-center gap-3'>
            <span className='hidden text-xs text-muted-foreground lg:inline'>
              {formatDateTime(window.from)} – {formatDateTime(window.to)}
            </span>
            <WindowSelect value={range} onChange={setRange} />
          </div>
        </Card>

        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <StatTile
            label='People'
            loading={loading}
            missing={!loading && usage.data === undefined}
            value={formatInteger(totals?.people ?? 0)}
            hint={`${activeLastDay} asked in the last 24 hours`}
          />
          <StatTile
            label='Questions'
            loading={loading}
            missing={!loading && usage.data === undefined}
            value={formatInteger(totals?.questions ?? 0)}
            hint='Docs site and console together'
          />
          <StatTile
            label='Cost'
            loading={loading}
            missing={!loading && usage.data === undefined}
            value={`US${formatUsd(totals?.costUsd ?? 0)}`}
            hint={
              totals && totals.questions > 0
                ? `~${formatUsd(totals.costUsd / totals.questions, 4)} per question`
                : 'No questions in the window'
            }
          />
          <StatTile
            label='Answered'
            loading={loading}
            missing={!loading && usage.data === undefined}
            value={
              totals && totals.questions > 0 ? formatPercent(sums.answered / totals.questions) : '–'
            }
          >
            <OutcomeBar {...sums} />
          </StatTile>
        </div>

        <DataGrid
          table={table}
          recordCount={shown.length}
          isLoading={loading}
          loadingMode='skeleton'
          emptyMessage={
            needle === ''
              ? 'Nobody asked OrcaSonar in this window.'
              : 'No reader matches the filter.'
          }
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
                  {needle === ''
                    ? plural(callers.length, 'reader')
                    : `${formatInteger(shown.length)} of ${plural(callers.length, 'reader')}`}
                </span>
              }
            >
              <RefreshButton onClick={refresh} busy={usage.isFetching && !loading} />
              <DensityToggle value={density} onChange={setDensity} />
              <ColumnsMenu table={table} />
            </TableToolbar>
            {usage.error ? (
              <ErrorState error={usage.error} onRetry={() => void usage.refetch()} />
            ) : (
              <>
                <DataGridContainer>
                  <DataGridScrollArea>
                    <DataGridTable />
                  </DataGridScrollArea>
                </DataGridContainer>
                <div className='border-t px-4 py-2'>
                  <DataGridPagination sizes={[10, 25, 50, 100]} />
                </div>
              </>
            )}
          </Card>
        </DataGrid>
      </div>
    </>
  );
}
