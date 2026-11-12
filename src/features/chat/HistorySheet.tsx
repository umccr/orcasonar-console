import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { useHistory } from '@/api/queries';
import { ErrorState } from '@/components/error-state';
import { Badge } from '@/components/reui/badge';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatRelative, plural } from '@/lib/format';
import { groupByDay } from './history-groups';
import { cn } from '@/lib/utils';

/** The reader's own conversations from the last 30 days, to read again or carry on. */
export function HistorySheet({
  open,
  onOpenChange,
  activeId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeId: string | undefined;
  onPick: (conversationId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='left' className='w-full gap-0 p-0 data-[side=left]:sm:max-w-[360px]'>
        <HistoryList activeId={activeId} onPick={onPick} />
      </SheetContent>
    </Sheet>
  );
}

/** The sheet's contents, mounted each time it opens, so the filter starts empty and "Today" is today. */
function HistoryList({
  activeId,
  onPick,
}: {
  activeId: string | undefined;
  onPick: (conversationId: string) => void;
}) {
  const history = useHistory(true);
  const [filter, setFilter] = useState('');
  const [openedAt] = useState(() => Date.now());
  const needle = filter.trim().toLowerCase();
  const groups = useMemo(() => {
    const all = history.data?.pages.flatMap((page) => page.items) ?? [];
    const shown =
      needle === '' ? all : all.filter((item) => item.title.toLowerCase().includes(needle));
    return groupByDay(shown, openedAt);
  }, [history.data, needle, openedAt]);

  return (
    <>
      <SheetHeader className='gap-1 border-b px-4 py-3 pe-12'>
        <SheetTitle className='flex items-center gap-2'>
          <History className='size-4' aria-hidden='true' />
          Your conversations
          <Badge variant='secondary' radius='full'>
            Last 30 days
          </Badge>
        </SheetTitle>
        <SheetDescription>Pick one to read it again and ask a follow-up.</SheetDescription>
      </SheetHeader>
      <div className='border-b p-3'>
        <InputGroup className='h-8'>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder='Filter by question…'
            aria-label='Filter by question'
          />
        </InputGroup>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto px-2 py-2'>
        {history.isPending ? (
          <div className='space-y-2 p-2'>
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className='h-11 w-full' />
            ))}
          </div>
        ) : history.error ? (
          <ErrorState error={history.error} onRetry={() => void history.refetch()} />
        ) : groups.length === 0 ? (
          <p className='px-3 py-6 text-center text-muted-foreground'>
            {needle === ''
              ? 'No conversations in the last 30 days.'
              : 'No conversation matches the filter.'}
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className='mb-3'>
              <h3 className='px-2 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase'>
                {group.label}
              </h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item.conversationId}>
                    <button
                      type='button'
                      onClick={() => onPick(item.conversationId)}
                      className={cn(
                        'w-full rounded-md px-2 py-1.5 text-start hover:bg-accent',
                        item.conversationId === activeId &&
                          'bg-sidebar-accent text-sidebar-accent-foreground'
                      )}
                    >
                      <span className='block truncate font-medium'>{item.title}</span>
                      <span
                        className='block text-xs text-muted-foreground'
                        title={formatDateTime(item.lastAt)}
                      >
                        {formatRelative(item.lastAt, openedAt)} ·{' '}
                        {plural(item.questions, 'question')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        {history.hasNextPage && (
          <Button
            variant='ghost'
            size='sm'
            className='w-full'
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            Load older conversations
          </Button>
        )}
      </div>
      <SheetFooter className='border-t px-4 py-2.5 text-xs text-muted-foreground'>
        Kept by OrcaSonar for 30 days. Questions that failed are left out.
      </SheetFooter>
    </>
  );
}
