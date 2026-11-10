import type { ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Rows3,
  Rows4,
  SlidersHorizontal,
} from 'lucide-react';
import type { DataGridFeatures } from '@/components/reui/data-grid/data-grid';
import { DataGridColumnVisibility } from '@/components/reui/data-grid/data-grid-column-visibility';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatInteger } from '@/lib/format';
import { PAGE_SIZES } from '@/lib/table';
import { cn } from '@/lib/utils';

/** The bar above a table: what it holds on the left, its controls on the right. */
export function TableToolbar({ summary, children }: { summary: ReactNode; children?: ReactNode }) {
  return (
    <div className='flex flex-wrap items-center gap-2 border-b px-4 py-2.5'>
      <div className='flex min-w-0 items-center gap-2 text-sm text-muted-foreground'>{summary}</div>
      <div className='ms-auto flex items-center gap-2'>{children}</div>
    </div>
  );
}

export function RefreshButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant='outline' size='icon' onClick={onClick} aria-label='Refresh' />}
      >
        <RefreshCw className={cn(busy && 'animate-spin')} />
      </TooltipTrigger>
      <TooltipContent>Refresh, up to now</TooltipContent>
    </Tooltip>
  );
}

export type Density = 'comfortable' | 'compact';

export function DensityToggle({
  value,
  onChange,
}: {
  value: Density;
  onChange: (density: Density) => void;
}) {
  return (
    <ToggleGroup
      variant='outline'
      spacing={0}
      value={[value]}
      onValueChange={(next: unknown[]) => {
        const [density] = next;
        if (density === 'comfortable' || density === 'compact') {
          onChange(density);
        }
      }}
      aria-label='Row density'
    >
      <ToggleGroupItem value='comfortable' aria-label='Comfortable rows' className='size-8 p-0'>
        <Rows3 />
      </ToggleGroupItem>
      <ToggleGroupItem value='compact' aria-label='Compact rows' className='size-8 p-0'>
        <Rows4 />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** Which columns show. It must sit inside the table's `<DataGrid>`. */
export function ColumnsMenu<TData extends object>({
  table,
}: {
  table: Table<DataGridFeatures, TData>;
}) {
  return (
    <DataGridColumnVisibility
      table={table}
      trigger={
        <Button variant='outline' size='default' className='h-8'>
          <SlidersHorizontal />
          Columns
        </Button>
      }
    />
  );
}

/**
 * Pages of a list the API pages by cursor, as the audit lists are: rows per page, the rows shown, and the previous and
 * next pages. A cursor can't jump to page n, so there are no page numbers.
 */
export function CursorPagination({
  page,
  pageSize,
  shown,
  total,
  hasNext,
  onPrevious,
  onNext,
  onPageSize,
  disabled,
}: {
  /** From 0. */
  page: number;
  pageSize: number;
  /** Rows on this page. */
  shown: number;
  /** Rows on every page, when the API says. */
  total?: number;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPageSize: (size: number) => void;
  disabled?: boolean;
}) {
  const first = shown === 0 ? 0 : page * pageSize + 1;
  const last = page * pageSize + shown;
  return (
    <div className='flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5'>
      <div className='flex items-center gap-2.5'>
        <span className='text-sm text-muted-foreground'>Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            const size = Number(value);
            if (Number.isInteger(size) && size > 0) {
              onPageSize(size);
            }
          }}
        >
          <SelectTrigger size='sm' className='w-fit min-w-16' aria-label='Rows per page'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='flex items-center gap-3'>
        <span className='text-sm text-muted-foreground tabular-nums'>
          {formatInteger(first)}–{formatInteger(last)}
          {total !== undefined && ` of ${formatInteger(total)}`}
        </span>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={onPrevious}
            disabled={disabled || page === 0}
            aria-label='Previous page'
          >
            <ChevronLeft />
          </Button>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={onNext}
            disabled={disabled || !hasNext}
            aria-label='Next page'
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
