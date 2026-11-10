import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  CircleStop,
  Copy,
  Info,
  SearchX,
  ShieldQuestion,
  Square,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/api/errors';
import { useFeedback } from '@/api/queries';
import { toAnswerSources, type HistoryExchange } from '@/api/types';
import { AnswerSources } from '@/components/answer-sources';
import { CopyId } from '@/components/copy-id';
import { copyText } from '@/lib/clipboard';
import { describeError } from '@/lib/describe-error';
import { Logo } from '@/components/logo';
import { Markdown } from '@/components/markdown';
import { SiteChip } from '@/components/score-bar';
import { TimeText } from '@/components/time-text';
import { Badge } from '@/components/reui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDuration, formatInteger, formatUsd, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { turnOutcome, type ChatTurn, type TurnError, type TurnOutcome } from './chat-state';

export function QuestionBubble({
  question,
  at,
  sites,
}: {
  question: string;
  at: string;
  sites?: readonly string[];
}) {
  return (
    <div className='flex flex-col items-end gap-1'>
      <div className='max-w-[85%] rounded-2xl rounded-tr-sm bg-muted px-4 py-2.5 whitespace-pre-wrap'>
        {question}
      </div>
      <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
        {sites?.map((site) => (
          <SiteChip key={site} site={site} />
        ))}
        <TimeText value={at} format='clock' className='tabular-nums' />
      </div>
    </div>
  );
}

const OUTCOME_BADGES: Record<
  Exclude<TurnOutcome, 'streaming'>,
  { label: string; variant: 'success-light' | 'warning-light' | 'destructive-light' | 'secondary' }
> = {
  answered: { label: 'Answered', variant: 'success-light' },
  'not-covered': { label: 'Not covered', variant: 'warning-light' },
  failed: { label: 'Failed', variant: 'destructive-light' },
  stopped: { label: 'Stopped', variant: 'secondary' },
};

function AnswerShell({
  at,
  badge,
  action,
  children,
  className,
}: {
  at?: string;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3 rounded-xl border bg-card p-4 shadow-xs', className)}>
      <div className='flex items-center gap-2'>
        <Logo className='size-6 rounded-md' />
        <span className='font-semibold'>OrcaSonar</span>
        {at && (
          <TimeText
            value={at}
            format='clock'
            className='text-xs text-muted-foreground tabular-nums'
          />
        )}
        <span className='ms-auto flex items-center gap-2'>
          {badge}
          {action}
        </span>
      </div>
      {children}
    </div>
  );
}

function SourcesList({
  sources,
  highlighted,
}: {
  sources: ChatTurn['sources'];
  highlighted?: number;
}) {
  return (
    <Collapsible defaultOpen className='rounded-lg border bg-muted/30'>
      <CollapsibleTrigger className='group flex w-full items-center gap-2 px-3 py-2 text-start text-xs font-medium text-muted-foreground hover:text-foreground'>
        <ChevronDown className='size-3.5 -rotate-90 transition-transform group-data-panel-open:rotate-0' />
        {plural(sources.length, 'source')} cited
      </CollapsibleTrigger>
      <CollapsibleContent className='px-2 pb-2'>
        <AnswerSources sources={sources} highlighted={highlighted} />
      </CollapsibleContent>
    </Collapsible>
  );
}

/** A turn from the reader's history: the question, the answer and its sources, without the live details. */
export function SavedTurn({ exchange }: { exchange: HistoryExchange }) {
  const sources = useMemo(() => toAnswerSources(exchange.citations), [exchange.citations]);
  const [cited, setCited] = useState<number>();
  return (
    <li className='space-y-3'>
      <QuestionBubble question={exchange.question} at={exchange.at} sites={exchange.sites} />
      <AnswerShell
        at={exchange.at}
        badge={
          <Badge variant='secondary' radius='full' size='lg'>
            From history
          </Badge>
        }
      >
        <Markdown text={exchange.answer} sources={sources} onCite={setCited} />
        {sources.length > 0 && <SourcesList sources={sources} highlighted={cited} />}
        <div className='flex justify-end'>
          <CopyId id={exchange.exchangeId} />
        </div>
      </AnswerShell>
    </li>
  );
}

const useNow = (running: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [running]);
  return now;
};

/** A question asked in this session, and its answer with how long it took, its tokens and what it cost. */
export function LiveTurn({ turn, onStop }: { turn: ChatTurn; onStop: () => void }) {
  const outcome = turnOutcome(turn);
  const streaming = outcome === 'streaming';
  const [cited, setCited] = useState<number>();
  const [inspecting, setInspecting] = useState(false);
  const now = useNow(streaming);

  const badge = streaming ? (
    <Badge variant='primary-light' radius='full' size='lg'>
      <span className='size-1.5 animate-pulse rounded-full bg-primary' />
      Writing…
    </Badge>
  ) : (
    <Badge variant={OUTCOME_BADGES[outcome].variant} radius='full' size='lg'>
      {OUTCOME_BADGES[outcome].label}
    </Badge>
  );

  return (
    <li className='space-y-3'>
      <QuestionBubble question={turn.question} at={turn.askedAt} sites={turn.sites} />
      {turn.status === 'failed' && turn.answer === '' && turn.error ? (
        <TurnErrorCard error={turn.error} />
      ) : (
        <AnswerShell
          at={turn.askedAt}
          badge={badge}
          action={
            streaming && (
              <Button variant='outline' size='sm' onClick={onStop}>
                <CircleStop />
                Stop
              </Button>
            )
          }
          className={cn(streaming && 'border-primary/40')}
        >
          {outcome === 'not-covered' ? (
            <div className='flex gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-warning-foreground dark:text-warning'>
              <SearchX className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
              <p>{turn.answer}</p>
            </div>
          ) : turn.answer === '' && streaming ? (
            <p className='text-muted-foreground'>Finding the passages to answer from…</p>
          ) : (
            <div className={cn(streaming && 'streaming-caret')}>
              <Markdown text={turn.answer} sources={turn.sources} onCite={setCited} />
            </div>
          )}

          {turn.status === 'failed' && turn.error && (
            <p className='flex items-center gap-1.5 text-xs text-destructive'>
              <Info className='size-3.5' aria-hidden='true' />
              {describeError(toApiError(turn.error)).title}: {turn.error.message}
            </p>
          )}
          {turn.status === 'stopped' && (
            <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <Square className='size-3' aria-hidden='true' />
              Stopped before the answer finished.
            </p>
          )}

          {turn.sources.length > 0 && <SourcesList sources={turn.sources} highlighted={cited} />}

          {streaming ? (
            <div className='flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground tabular-nums'>
              <span className='size-1.5 animate-pulse rounded-full bg-primary' />
              Streaming · {formatDuration(Math.max(0, now - Date.parse(turn.askedAt)))} elapsed ·{' '}
              {plural(turn.answer.length, 'character')} so far
            </div>
          ) : (
            <TurnDetails
              turn={turn}
              inspecting={inspecting}
              onInspect={() => setInspecting((open) => !open)}
            />
          )}
          {inspecting && !streaming && <InspectPanel turn={turn} />}
        </AnswerShell>
      )}
    </li>
  );
}

const toApiError = (error: TurnError) =>
  new ApiError(error.status, error.code, error.message, error.retryAfter);

/** A question OrcaSonar refused or never answered, such as one over today's allowance. */
function TurnErrorCard({ error }: { error: TurnError }) {
  const { title, description } = describeError(toApiError(error));
  const waiting = error.code === 'over-budget' || error.code === 'throttled';
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3',
        waiting
          ? 'border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning'
          : 'border-destructive/30 bg-destructive/5 text-destructive'
      )}
    >
      <ShieldQuestion className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
      <div>
        <p className='font-semibold'>{title}</p>
        <p className='text-sm opacity-90'>{description}</p>
      </div>
    </div>
  );
}

/** The line under a finished answer: its timings, tokens, cost and ID, and what can be done with it. */
function TurnDetails({
  turn,
  inspecting,
  onInspect,
}: {
  turn: ChatTurn;
  inspecting: boolean;
  onInspect: () => void;
}) {
  const feedback = useFeedback();
  const [rating, setRating] = useState<'up' | 'down'>();
  const { timing, usage } = turn;
  const total = timing.done ?? timing.end;
  const parts = [
    timing.firstDelta !== undefined && `First text ${formatDuration(timing.firstDelta)}`,
    total !== undefined && `Total ${formatDuration(total)}`,
    usage &&
      (usage.inputTokens === 0 && usage.outputTokens === 0
        ? 'No model call'
        : `${formatInteger(usage.inputTokens)} in / ${formatInteger(usage.outputTokens)} out tokens`),
    turn.costUsd !== undefined && `US${formatUsd(turn.costUsd, 4)}`,
  ].filter((part): part is string => typeof part === 'string');

  const rate = (next: 'up' | 'down') => {
    if (!turn.exchangeId) {
      return;
    }
    feedback.mutate(
      { exchangeId: turn.exchangeId, rating: next },
      {
        onSuccess: () => {
          setRating(next);
          toast.success('Feedback sent', { description: 'It is kept with the exchange.' });
        },
        onError: (error) => toast.error("Couldn't send feedback", describeError(error)),
      }
    );
  };

  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3 text-xs text-muted-foreground tabular-nums'>
      <span>{parts.join(' · ')}</span>
      {turn.exchangeId && <CopyId id={turn.exchangeId} />}
      <span className='ms-auto flex items-center gap-0.5'>
        <IconAction
          label='Copy the answer'
          onClick={() => void copyText(turn.answer, 'The answer')}
        >
          <Copy />
        </IconAction>
        <IconAction
          label='A good answer'
          pressed={rating === 'up'}
          disabled={!turn.exchangeId || feedback.isPending}
          onClick={() => rate('up')}
        >
          <ThumbsUp />
        </IconAction>
        <IconAction
          label='A poor answer'
          pressed={rating === 'down'}
          disabled={!turn.exchangeId || feedback.isPending}
          onClick={() => rate('down')}
        >
          <ThumbsDown />
        </IconAction>
        <Button
          variant={inspecting ? 'secondary' : 'ghost'}
          size='sm'
          className='h-7 text-primary'
          onClick={onInspect}
          aria-expanded={inspecting}
        >
          {'</>'} Inspect
        </Button>
      </span>
    </div>
  );
}

function IconAction({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={label}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
            className={cn(pressed && 'bg-primary/10 text-primary')}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** The stream as it arrived: when each event came, and the data of each but the text. */
function InspectPanel({ turn }: { turn: ChatTurn }) {
  const { timing } = turn;
  const span = (from?: number, to?: number) =>
    from === undefined
      ? '–'
      : to === undefined || to === from
        ? formatDuration(from)
        : `${formatDuration(from)} – ${formatDuration(to)}`;
  const last = turn.events.error === undefined ? 'done' : 'error';
  const boxes = [
    { name: 'meta', at: span(timing.meta), note: 'IDs assigned' },
    {
      name: `delta ×${timing.deltas}`,
      at: span(timing.firstDelta, timing.lastDelta),
      note: 'The answer text',
    },
    { name: 'citations', at: span(timing.citations), note: plural(turn.sources.length, 'source') },
    {
      name: last,
      at: span(last === 'done' ? timing.done : timing.end),
      note: last === 'done' ? 'Tokens and cost' : 'The stream failed',
    },
  ];
  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2'>
        <span className='text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase'>
          Stream events
        </span>
        <span className='text-xs text-muted-foreground'>
          Server-sent events, timed from sending the question
        </span>
      </div>
      <div className='grid grid-cols-2 gap-px bg-border sm:grid-cols-4'>
        {boxes.map((box) => (
          <div key={box.name} className='bg-card px-3 py-2'>
            <div className='font-mono text-[10px] text-muted-foreground uppercase'>{box.name}</div>
            <div className='font-semibold tabular-nums'>{box.at}</div>
            <div className='text-xs text-muted-foreground'>{box.note}</div>
          </div>
        ))}
      </div>
      <pre className='max-h-72 overflow-auto border-t bg-muted/30 px-3 py-2 font-mono text-[11px] leading-relaxed'>
        {JSON.stringify(turn.events, null, 2)}
      </pre>
    </div>
  );
}
