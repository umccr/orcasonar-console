import { useCallback, useState, type FormEvent } from 'react';
import type { Table } from '@tanstack/react-table';
import { ClipboardList, Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useAuditUsage } from '@/api/queries';
import type { AuditUsage } from '@/api/types';
import { ColumnsMenu, DensityToggle, RefreshButton, type Density } from '@/components/data-table';
import { PAGE_SIZES } from '@/lib/table';
import { AuditForbidden } from '@/components/error-state';
import { isForbidden } from '@/lib/describe-error';
import { OutcomeSelect, WindowSelect } from '@/components/filters';
import { isOutcome } from '@/lib/outcomes';
import { PageHeader } from '@/components/page-header';
import type { DataGridFeatures } from '@/components/reui/data-grid/data-grid';
import { StatTile } from '@/components/stat-tile';
import { Card } from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuditWindow } from '@/hooks/use-audit-window';
import { useStoredChoice } from '@/hooks/use-stored-choice';
import { formatInteger, formatPercent, formatRelative, formatUsd, plural } from '@/lib/format';
import { ConversationSheet } from './ConversationSheet';
import { ConversationsTable } from './ConversationsTable';
import { ExchangesTable } from './ExchangesTable';

type View = 'conversations' | 'exchanges';

const DENSITIES = ['comfortable', 'compact'] as const satisfies readonly Density[];
const SIZES = PAGE_SIZES.map(String);
const CONVERSATION_ID = /^c_[0-9a-f]{32}$/;

export function AuditLogPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'exchanges' ? 'exchanges' : 'conversations';
  const caller = params.get('caller') ?? undefined;
  const outcomeParam = params.get('outcome');
  const outcome = isOutcome(outcomeParam) ? outcomeParam : undefined;
  const openConversation = params.get('conversation') ?? undefined;
  const openExchange = params.get('exchange') ?? undefined;

  const { range, window, setRange, refresh } = useAuditWindow();
  const usage = useAuditUsage(window);
  const [density, setDensity] = useStoredChoice<Density>('audit.density', DENSITIES, 'comfortable');
  const [pageSize, setPageSize] = useStoredChoice('audit.pageSize', SIZES, '50');

  const update = useCallback(
    (changes: Record<string, string | undefined>) =>
      setParams((current) => {
        const next = new URLSearchParams(current);
        for (const [name, value] of Object.entries(changes)) {
          if (value === undefined) {
            next.delete(name);
          } else {
            next.set(name, value);
          }
        }
        return next;
      }),
    [setParams]
  );

  const open = useCallback(
    (conversationId: string, exchangeId?: string) =>
      update({ conversation: conversationId, exchange: exchangeId }),
    [update]
  );

  const toolbar = <TData extends object>(table: Table<DataGridFeatures, TData>) => (
    <>
      <ToggleGroup
        variant='outline'
        spacing={0}
        value={[view]}
        onValueChange={(next: unknown[]) => {
          const [selected] = next;
          if (selected === 'conversations' || selected === 'exchanges') {
            update({ view: selected === 'conversations' ? undefined : selected });
          }
        }}
        aria-label='Show by'
      >
        <ToggleGroupItem value='conversations' className='h-8 px-3'>
          Conversations
        </ToggleGroupItem>
        <ToggleGroupItem value='exchanges' className='h-8 px-3'>
          Exchanges
        </ToggleGroupItem>
      </ToggleGroup>
      <RefreshButton onClick={refresh} busy={usage.isFetching && !usage.isPending} />
      <DensityToggle value={density} onChange={setDensity} />
      <ColumnsMenu table={table} />
    </>
  );

  const header = (
    <PageHeader
      icon={ClipboardList}
      title='Audit log'
      info={
        <>
          <p>
            An <strong className='text-foreground'>exchange</strong> is one question and its answer.
            A <strong className='text-foreground'>conversation</strong> is a reader&apos;s first
            question and its follow-ups.
          </p>
          <p>
            Conversations are listed by their latest activity. Their totals count the exchanges in
            the window; opening one shows all of it. The audit log keeps 30 days.
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

  const tableProps = {
    params: { window, caller, outcome, limit: Number(pageSize) },
    onOpen: open,
    density,
    toolbar,
    onPageSize: (size: number) => setPageSize(String(size)),
  };

  return (
    <>
      {header}
      <div className='space-y-4 px-4 pb-8 sm:px-6'>
        <Card className='flex-row flex-wrap items-center gap-3 px-3 py-3'>
          <ReaderSearch
            key={caller ?? ''}
            caller={caller}
            onReader={(reader) => update({ caller: reader })}
            onConversation={(conversationId) => open(conversationId)}
          />
          <div className='ms-auto flex flex-wrap items-center gap-3'>
            <OutcomeSelect value={outcome} onChange={(next) => update({ outcome: next })} />
            <WindowSelect value={range} onChange={setRange} />
          </div>
        </Card>

        <AuditTiles usage={usage.data} loading={usage.isPending} caller={caller} />

        {view === 'conversations' ? (
          <ConversationsTable {...tableProps} />
        ) : (
          <ExchangesTable {...tableProps} />
        )}
      </div>
      <ConversationSheet
        conversationId={openConversation}
        exchangeId={openExchange}
        onClose={() => update({ conversation: undefined, exchange: undefined })}
      />
    </>
  );
}

/**
 * Finds a reader, by email or Cognito `sub` as the API takes them, or opens a conversation by its ID. The API matches
 * a reader exactly, ignoring case: there is no search of question text.
 */
function ReaderSearch({
  caller,
  onReader,
  onConversation,
}: {
  caller: string | undefined;
  onReader: (reader: string | undefined) => void;
  onConversation: (conversationId: string) => void;
}) {
  const [text, setText] = useState(caller ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (CONVERSATION_ID.test(value)) {
      onConversation(value);
      setText(caller ?? '');
    } else {
      onReader(value === '' ? undefined : value);
    }
  };
  return (
    <form onSubmit={submit} className='min-w-64 flex-1 sm:max-w-lg'>
      <InputGroup className='h-9 bg-card'>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='Reader email or ID, or a conversation ID (c_…), then Enter'
          aria-label='Reader email or ID, or a conversation ID'
        />
        {caller && (
          <InputGroupAddon align='inline-end'>
            <InputGroupButton
              size='icon-xs'
              aria-label='Show every reader'
              onClick={() => {
                setText('');
                onReader(undefined);
              }}
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </form>
  );
}

/** The window at a glance, from `/audit/usage`: everyone's, or one reader's when the list is filtered to them. */
function AuditTiles({
  usage,
  loading,
  caller,
}: {
  usage: AuditUsage | undefined;
  loading: boolean;
  caller: string | undefined;
}) {
  const needle = caller?.toLowerCase();
  const reader =
    needle === undefined
      ? undefined
      : usage?.callers.find(
          (entry) => entry.id.toLowerCase() === needle || entry.email?.toLowerCase() === needle
        );
  const everyone = usage?.callers.reduce(
    (sum, entry) => ({
      answered: sum.answered + entry.answered,
      notCovered: sum.notCovered + entry.notCovered,
      failed: sum.failed + entry.failed,
    }),
    { answered: 0, notCovered: 0, failed: 0 }
  );
  const stats =
    caller === undefined
      ? {
          questions: usage?.totals.questions ?? 0,
          costUsd: usage?.totals.costUsd ?? 0,
          answered: everyone?.answered ?? 0,
          notCovered: everyone?.notCovered ?? 0,
          failed: everyone?.failed ?? 0,
        }
      : {
          questions: reader?.questions ?? 0,
          costUsd: reader?.costUsd ?? 0,
          answered: reader?.answered ?? 0,
          notCovered: reader?.notCovered ?? 0,
          failed: reader?.failed ?? 0,
        };

  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      <StatTile
        label='Questions'
        loading={loading}
        missing={!loading && usage === undefined}
        value={formatInteger(stats.questions)}
        hint={caller === undefined ? 'Every reader, in the window' : `From ${caller}`}
      />
      <StatTile
        label='Window cost'
        loading={loading}
        missing={!loading && usage === undefined}
        value={`US${formatUsd(stats.costUsd)}`}
        hint={
          stats.questions > 0
            ? `Avg ${formatUsd(stats.costUsd / stats.questions, 4)} per question`
            : 'Nothing spent'
        }
      />
      {caller === undefined ? (
        <StatTile
          label='Active readers'
          loading={loading}
          missing={!loading && usage === undefined}
          value={formatInteger(usage?.totals.people ?? 0)}
          hint='Asked at least once'
        />
      ) : (
        <StatTile
          label='Last asked'
          loading={loading}
          missing={!loading && usage === undefined}
          value={
            reader ? formatRelative(reader.lastAt, Date.parse(usage?.to ?? reader.lastAt)) : '–'
          }
          hint={reader ? 'Before the end of the window' : 'No questions in the window'}
        />
      )}
      <StatTile
        label='Answered'
        loading={loading}
        missing={!loading && usage === undefined}
        value={stats.questions > 0 ? formatPercent(stats.answered / stats.questions) : '–'}
        hint={`${plural(stats.notCovered, 'not covered', 'not covered')} · ${formatInteger(stats.failed)} failed`}
      />
    </div>
  );
}
