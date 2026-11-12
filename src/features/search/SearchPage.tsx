import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { ListOrdered, Minus, PanelRightOpen, Plus, Search, Trash2 } from 'lucide-react';
import { ApiError, isApiError } from '@/api/errors';
import { useSearch } from '@/api/queries';
import { describeError } from '@/lib/describe-error';
import { PageHeader } from '@/components/page-header';
import { ScoreBar, SiteChip } from '@/components/score-bar';
import { SitesPicker } from '@/components/sites-picker';
import { TimeText } from '@/components/time-text';
import { Badge } from '@/components/reui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration, plural } from '@/lib/format';
import { noteSites } from '@/lib/known-sites';
import { cn } from '@/lib/utils';
import { DocumentSheet, type DocumentTarget } from './DocumentSheet';
import { loadThread, ranked, saveThread, type SearchTurn } from './search-thread';

const MAX_TOP_K = 20;
const DEFAULT_MIN_SCORE = 0.3;

/**
 * Search the docs as OrcaSonar does before it answers: each search is a turn in a thread, and the reply is the ranked
 * passages, with no answer written. Searches aren't recorded or budgeted; the thread stays in this tab.
 */
export function SearchPage() {
  const [turns, setTurns] = useState<SearchTurn[]>(loadThread);
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(8);
  const [sites, setSites] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(DEFAULT_MIN_SCORE);
  const [openPage, setOpenPage] = useState<DocumentTarget>();
  const search = useSearch();

  useEffect(() => saveThread(turns), [turns]);

  const thread = useRef<HTMLDivElement>(null);
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length]);

  const pending = turns.some((turn) => turn.status === 'pending');

  const run = async (event: FormEvent) => {
    event.preventDefault();
    const text = query.trim();
    if (text === '' || pending) {
      return;
    }
    const key = crypto.randomUUID();
    const started = performance.now();
    const asked = { key, query: text, topK, sites, askedAt: new Date().toISOString() };
    setTurns((current) => [...current, { ...asked, status: 'pending' }]);
    setQuery('');
    try {
      const { results } = await search.mutateAsync({
        query: text,
        topK,
        ...(sites.length > 0 ? { sites } : {}),
      });
      noteSites(results.map((result) => result.site));
      const ms = Math.round(performance.now() - started);
      setTurns((current) =>
        current.map((turn) => (turn.key === key ? { ...turn, status: 'done', results, ms } : turn))
      );
    } catch (error) {
      const failure = isApiError(error) ? error : ApiError.network(error);
      setTurns((current) =>
        current.map((turn) =>
          turn.key === key
            ? {
                ...turn,
                status: 'failed',
                error: { status: failure.status, code: failure.code, message: failure.message },
              }
            : turn
        )
      );
    }
  };

  return (
    <div className='flex h-svh min-h-0 flex-col'>
      <PageHeader
        icon={Search}
        title='Search'
        info={
          <>
            <p>
              The passages OrcaSonar would give the model for a question, best first, with their
              scores. No answer is written.
            </p>
            <p>
              Minimum score is a preview: it greys out the passages below it here and changes
              nothing in OrcaSonar. Searches aren&apos;t recorded or budgeted.
            </p>
          </>
        }
        actions={
          <Button variant='outline' onClick={() => setTurns([])} disabled={turns.length === 0}>
            <Trash2 />
            Clear
          </Button>
        }
      />

      <div ref={thread} className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-[900px] px-4 py-6'>
          {turns.length === 0 ? (
            <div className='flex flex-col items-center gap-3 py-16 text-center'>
              <span className='flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <ListOrdered className='size-5' />
              </span>
              <h2 className='text-lg font-semibold'>See what OrcaSonar finds</h2>
              <p className='max-w-md text-muted-foreground'>
                Search the docs to check which passages a question finds and how well they score.
              </p>
            </div>
          ) : (
            <ol className='space-y-6'>
              {turns.map((turn) => (
                <li key={turn.key} className='space-y-3'>
                  <SearchBubble turn={turn} />
                  <SearchReply turn={turn} minScore={minScore} onOpen={setOpenPage} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <form onSubmit={(event) => void run(event)} className='border-t bg-background px-4 pt-3 pb-4'>
        <div className='mx-auto w-full max-w-[900px] space-y-2'>
          <InputGroup className='h-11 bg-card'>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Search UMCCR documentation…'
              aria-label='Search'
              maxLength={2000}
            />
            <InputGroupAddon align='inline-end'>
              <InputGroupButton
                type='submit'
                variant='default'
                size='sm'
                className='h-8 px-4'
                disabled={query.trim() === '' || pending}
              >
                Search
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground'>
            <span className='flex items-center gap-1.5'>
              Top K
              <Button
                type='button'
                variant='outline'
                size='icon-xs'
                aria-label='Fewer results'
                disabled={topK <= 1}
                onClick={() => setTopK((value) => Math.max(1, value - 1))}
              >
                <Minus />
              </Button>
              <span className='w-5 text-center font-semibold text-foreground tabular-nums'>
                {topK}
              </span>
              <Button
                type='button'
                variant='outline'
                size='icon-xs'
                aria-label='More results'
                disabled={topK >= MAX_TOP_K}
                onClick={() => setTopK((value) => Math.min(MAX_TOP_K, value + 1))}
              >
                <Plus />
              </Button>
            </span>
            <SitesPicker value={sites} onChange={setSites} />
            <label className='flex items-center gap-1.5'>
              Min score
              <Input
                type='number'
                min={0}
                max={1}
                step={0.05}
                value={minScore}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value)) {
                    setMinScore(Math.min(1, Math.max(0, value)));
                  }
                }}
                className='h-7 w-18 text-xs'
              />
            </label>
            <span className='ms-auto'>
              Searches aren&apos;t recorded. This thread stays in this browser tab.
            </span>
          </div>
        </div>
      </form>

      <DocumentSheet target={openPage} onClose={() => setOpenPage(undefined)} />
    </div>
  );
}

function SearchBubble({ turn }: { turn: SearchTurn }) {
  return (
    <div className='flex flex-col items-end gap-1'>
      <div className='max-w-[85%] rounded-2xl rounded-tr-sm bg-muted px-4 py-2.5 whitespace-pre-wrap'>
        {turn.query}
      </div>
      <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
        <span>
          Top {turn.topK} · {turn.sites.length === 0 ? 'all sites' : turn.sites.join(', ')}
        </span>
        · <TimeText value={turn.askedAt} format='clock' className='tabular-nums' />
      </div>
    </div>
  );
}

function SearchReply({
  turn,
  minScore,
  onOpen,
}: {
  turn: SearchTurn;
  minScore: number;
  onOpen: (target: DocumentTarget) => void;
}) {
  if (turn.status === 'pending') {
    return (
      <div className='space-y-2 rounded-xl border bg-card p-4'>
        <Skeleton className='h-4 w-1/3' />
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-10 w-full' />
      </div>
    );
  }
  if (turn.status === 'failed' || !turn.results) {
    const { title, description } = describeError(
      new ApiError(
        turn.error?.status ?? 0,
        turn.error?.code ?? 'unknown',
        turn.error?.message ?? 'The search failed.'
      )
    );
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive'>
        <p className='font-semibold'>{title}</p>
        <p className='text-sm opacity-90'>{description}</p>
      </div>
    );
  }

  const rows = ranked(turn.results);
  const below = rows.filter(({ result }) => result.score < minScore).length;
  const best = rows[0]?.result.score;
  return (
    <div className='overflow-hidden rounded-xl border bg-card shadow-xs'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5'>
        <span className='flex items-center gap-2 font-medium'>
          <ListOrdered className='size-4 text-muted-foreground' aria-hidden='true' />
          Passages, best first
        </span>
        <span className='text-xs text-muted-foreground tabular-nums'>
          {plural(rows.length, 'passage')}
          {turn.ms !== undefined && ` · ${formatDuration(turn.ms)}`}
          {best !== undefined && ` · best ${best.toFixed(2)}`}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className='px-4 py-6 text-center text-muted-foreground'>Nothing in the docs matched.</p>
      ) : (
        <ol className='divide-y'>
          {rows.map(({ rank, result }, index) => {
            const muted = result.score < minScore;
            const firstBelow =
              muted && (index === 0 || (rows[index - 1]?.result.score ?? 0) >= minScore);
            return (
              <Fragment key={`${result.id}-${rank}`}>
                {firstBelow && (
                  <li className='flex items-center gap-3 bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground'>
                    <span className='h-px flex-1 border-t border-dashed border-muted-foreground/50' />
                    Below the minimum score of {minScore.toFixed(2)} · {plural(below, 'passage')}
                    <span className='h-px flex-1 border-t border-dashed border-muted-foreground/50' />
                  </li>
                )}
                <li
                  className={cn(
                    'grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-x-3 px-4 py-3',
                    muted && 'opacity-55'
                  )}
                >
                  <span
                    className={cn(
                      'pt-0.5 font-mono text-xs font-semibold',
                      muted ? 'text-muted-foreground' : 'text-primary'
                    )}
                  >
                    #{rank}
                  </span>
                  <div className='min-w-0 space-y-1'>
                    <div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
                      <button
                        type='button'
                        className='truncate text-start font-semibold hover:text-primary hover:underline'
                        onClick={() =>
                          onOpen({ id: result.id, title: result.title, snippet: result.snippet })
                        }
                      >
                        {result.title}
                      </button>
                      <SiteChip site={result.site} />
                      <span className='truncate font-mono text-[11px] text-muted-foreground'>
                        {result.id}
                      </span>
                    </div>
                    <p className='line-clamp-2 text-muted-foreground'>{result.snippet}</p>
                  </div>
                  <div className='flex items-start gap-1'>
                    <ScoreBar score={result.score} muted={muted} />
                    <Button
                      variant='ghost'
                      size='icon-xs'
                      aria-label={`Open ${result.title}`}
                      onClick={() =>
                        onOpen({ id: result.id, title: result.title, snippet: result.snippet })
                      }
                    >
                      <PanelRightOpen />
                    </Button>
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ol>
      )}
      {below > 0 && minScore > 0 && (
        <div className='border-t px-4 py-2 text-xs text-muted-foreground'>
          <Badge variant='secondary' radius='full'>
            Preview
          </Badge>{' '}
          The minimum score greys out passages here only.
        </div>
      )}
    </div>
  );
}
