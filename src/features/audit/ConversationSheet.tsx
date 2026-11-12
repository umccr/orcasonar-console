import { useEffect, useMemo, useState } from 'react';
import { Link2, MessageSquarePlus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuditConversation } from '@/api/queries';
import { toAnswerSources, type AuditCaller, type AuditExchange } from '@/api/types';
import { AnswerSources } from '@/components/answer-sources';
import { CopyId } from '@/components/copy-id';
import { copyText } from '@/lib/clipboard';
import { ErrorState } from '@/components/error-state';
import { Markdown } from '@/components/markdown';
import { GuardrailBadge, OutcomeBadge } from '@/components/outcome-badge';
import { TimeText } from '@/components/time-text';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatClock,
  formatDuration,
  formatFullDateTime,
  formatInteger,
  formatUsd,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { callerName, otherCaller } from './other-caller';

/**
 * One conversation from the audit log, over the list: every exchange, oldest first, as its reader saw it. An exchange
 * someone else asked, a follow-up they were refused, names who asked it.
 */
export function ConversationSheet({
  conversationId,
  exchangeId,
  onClose,
}: {
  conversationId: string | undefined;
  /** An exchange to scroll to and pick out, when opened from the exchange log. */
  exchangeId: string | undefined;
  onClose: () => void;
}) {
  // Kept while the sheet slides shut, so it doesn't empty as it goes.
  const [lastId, setLastId] = useState(conversationId);
  if (conversationId !== undefined && conversationId !== lastId) {
    setLastId(conversationId);
  }
  const id = conversationId ?? lastId;
  const query = useAuditConversation(id);
  const navigate = useNavigate();
  const exchanges = useMemo(() => query.data?.exchanges ?? [], [query.data]);
  const first = exchanges[0];
  const last = exchanges.at(-1);

  useEffect(() => {
    if (exchangeId && query.data) {
      document
        .getElementById(`exchange-${exchangeId}`)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [exchangeId, query.data]);

  return (
    <Sheet
      open={conversationId !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent side='right' className='w-full gap-0 p-0 data-[side=right]:sm:max-w-[760px]'>
        <SheetHeader className='gap-1.5 border-b px-6 py-4 pe-14'>
          <SheetTitle className='flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-semibold'>
            Conversation
            {id && <CopyId id={id} />}
          </SheetTitle>
          <SheetDescription className='flex flex-wrap items-center gap-x-3 gap-y-1'>
            {first ? (
              <>
                <span className='font-medium text-foreground'>{callerName(first.caller)}</span>
                {last && (
                  <span>
                    {formatFullDateTime(first.at)} – {formatClock(last.at)}
                  </span>
                )}
              </>
            ) : (
              <span>From the audit log</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className='min-h-0 flex-1 overflow-y-auto'>
          {query.isPending ? (
            <div className='space-y-4 p-6'>
              <Skeleton className='h-14 w-full' />
              <Skeleton className='ms-auto h-10 w-2/3' />
              <Skeleton className='h-40 w-full' />
            </div>
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : (
            <>
              <ConversationStats exchanges={exchanges} />
              <ol className='space-y-6 px-6 py-5'>
                {exchanges.map((exchange) => (
                  <AuditTurn
                    key={exchange.exchangeId}
                    exchange={exchange}
                    askedBy={otherCaller(exchange, first)}
                    highlighted={exchange.exchangeId === exchangeId}
                  />
                ))}
              </ol>
            </>
          )}
        </div>

        <SheetFooter className='flex-row justify-end gap-2 border-t px-6 py-3'>
          <Button
            variant='outline'
            onClick={() => void copyText(window.location.href, 'A link to this conversation')}
          >
            <Link2 />
            Copy link
          </Button>
          <Button
            variant='outline'
            disabled={!first}
            onClick={() => {
              if (first) {
                void navigate(`/chat?ask=${encodeURIComponent(first.question)}`);
              }
            }}
            title='Start a new conversation in Chat with its first question'
          >
            <MessageSquarePlus />
            Ask again in Chat
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ConversationStats({ exchanges }: { exchanges: readonly AuditExchange[] }) {
  const stats = useMemo(() => {
    const first = exchanges[0];
    const last = exchanges.at(-1);
    const sum = (value: (exchange: AuditExchange) => number) =>
      exchanges.reduce((total, exchange) => total + value(exchange), 0);
    const count = (test: (exchange: AuditExchange) => boolean) => exchanges.filter(test).length;
    return [
      { label: 'Questions', value: formatInteger(exchanges.length) },
      { label: 'Answered', value: formatInteger(count((x) => x.outcome === 'answered')) },
      { label: 'Not covered', value: formatInteger(count((x) => x.outcome === 'not-covered')) },
      { label: 'Failed', value: formatInteger(count((x) => x.outcome === 'failed')) },
      {
        label: 'Tokens',
        value: `${formatInteger(sum((x) => x.usage?.inputTokens ?? 0))} in / ${formatInteger(sum((x) => x.usage?.outputTokens ?? 0))} out`,
      },
      {
        label: 'Cost',
        value: `US${formatUsd(
          sum((x) => x.costUsd ?? 0),
          4
        )}`,
      },
      { label: 'Guardrail', value: formatInteger(count((x) => x.guardrail === 'intervened')) },
      {
        label: 'Duration',
        value:
          first && last
            ? formatDuration(Date.parse(last.at) + (last.latencyMs ?? 0) - Date.parse(first.at))
            : '–',
      },
    ];
  }, [exchanges]);

  return (
    <dl className='grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-4'>
      {stats.map((stat) => (
        <div key={stat.label} className='bg-popover px-5 py-2.5'>
          <dt className='text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase'>
            {stat.label}
          </dt>
          <dd className='truncate font-semibold tabular-nums'>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const modelName = (modelId: string) => modelId.split('/').at(-1) ?? modelId;

function AuditTurn({
  exchange,
  askedBy,
  highlighted,
}: {
  exchange: AuditExchange;
  /** Who asked it, when that is not who asked the first question. */
  askedBy: AuditCaller | undefined;
  highlighted: boolean;
}) {
  const sources = useMemo(() => toAnswerSources(exchange.sources), [exchange.sources]);
  const [cited, setCited] = useState<number>();
  return (
    <li
      id={`exchange-${exchange.exchangeId}`}
      className={cn(
        'scroll-mt-4 space-y-3 rounded-xl',
        highlighted && 'ring-2 ring-primary/30 ring-offset-8 ring-offset-popover'
      )}
    >
      <div className='flex flex-col items-end gap-1'>
        <div className='max-w-[85%] rounded-2xl rounded-tr-sm bg-muted px-4 py-2.5 whitespace-pre-wrap'>
          {exchange.question}
        </div>
        <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
          {askedBy && (
            <>
              <span className='font-medium text-foreground' title={askedBy.id}>
                Asked by {callerName(askedBy)}
              </span>
              <span aria-hidden='true'>·</span>
            </>
          )}
          <TimeText value={exchange.at} format='seconds' className='tabular-nums' />
        </div>
      </div>
      <div className='space-y-3 rounded-xl border bg-card p-4'>
        {exchange.outcome === 'failed' ? (
          <p className='text-muted-foreground'>No answer was returned.</p>
        ) : (
          <Markdown text={exchange.answer ?? ''} sources={sources} onCite={setCited} />
        )}
        {sources.length > 0 && (
          <div className='space-y-1.5'>
            <div className='text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase'>
              Sources
            </div>
            <AnswerSources sources={sources} highlighted={cited} />
          </div>
        )}
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3 text-xs text-muted-foreground'>
          <OutcomeBadge outcome={exchange.outcome}>
            {exchange.errorCode && ` · ${exchange.errorCode}`}
          </OutcomeBadge>
          {exchange.guardrail === 'intervened' && <GuardrailBadge />}
          {exchange.modelId && (
            <span className='font-mono' title={exchange.modelId}>
              {modelName(exchange.modelId)}
            </span>
          )}
          {exchange.usage && (
            <span>
              {formatInteger(exchange.usage.inputTokens)} in /{' '}
              {formatInteger(exchange.usage.outputTokens)} out tokens
            </span>
          )}
          {exchange.costUsd !== undefined && <span>US{formatUsd(exchange.costUsd, 4)}</span>}
          {exchange.latencyMs !== undefined && <span>{formatDuration(exchange.latencyMs)}</span>}
          <CopyId id={exchange.exchangeId} className='ms-auto' />
        </div>
      </div>
    </li>
  );
}
