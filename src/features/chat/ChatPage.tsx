import { useEffect, useRef, useState } from 'react';
import { History, MessageSquare, Plus, TriangleAlert } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useHistoryConversation } from '@/api/queries';
import { ErrorState } from '@/components/error-state';
import { Logo } from '@/components/logo';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveTurn, SavedTurn } from './ChatTurns';
import { Composer } from './Composer';
import { HistorySheet } from './HistorySheet';
import { useChat } from './use-chat';

const EXAMPLES = [
  'How do I add a site to docs.umccr.org?',
  'How do I publish a page on the docs platform?',
];

/**
 * Ask OrcaSonar as a reader would, one question after another in a conversation, and see how each answer was made.
 * `?conversation=c_…` reopens one of the reader's own conversations from history to carry it on; `?ask=` fills in a
 * question, as "Ask again in Chat" does from the audit log.
 */
export function ChatPage() {
  const [params, setParams] = useSearchParams();
  const reopened = params.get('conversation') ?? undefined;
  const prefill = params.get('ask') ?? '';
  const { state, ask, stop, reset } = useChat();
  const saved = useHistoryConversation(reopened);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sites, setSites] = useState<string[]>([]);

  const streaming = state.turns.some((turn) => turn.status === 'streaming');
  // A refetch of the reopened conversation can hold follow-ups this session also shows live.
  const liveIds = new Set(state.turns.map((turn) => turn.exchangeId));
  const savedTurns = saved.data?.exchanges.filter((exchange) => !liveIds.has(exchange.exchangeId));
  const conversationId = state.conversationId ?? (saved.data ? reopened : undefined);
  const empty = state.turns.length === 0 && reopened === undefined;

  const startNew = () => {
    reset();
    setParams({});
  };

  const pick = (id: string) => {
    reset();
    setParams({ conversation: id });
    setHistoryOpen(false);
  };

  const send = (question: string) => {
    if (prefill) {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('ask');
          return next;
        },
        { replace: true }
      );
    }
    void ask(question, { sites, conversationId });
  };

  // Follows the answer as it streams in, unless the reader has scrolled up to read.
  const thread = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const last = state.turns.at(-1);
  useEffect(() => {
    const element = thread.current;
    if (element && pinned.current) {
      element.scrollTo({ top: element.scrollHeight });
    }
  }, [state.turns.length, last?.answer.length, last?.status, saved.data]);

  return (
    <div className='flex h-svh min-h-0 flex-col'>
      <PageHeader
        icon={MessageSquare}
        title='Chat'
        info={
          <>
            <p>
              Ask OrcaSonar as a reader would, with follow-ups. Each answer shows when its first
              text came, how long it took, its tokens and what it cost; Inspect shows the stream
              itself.
            </p>
            <p>History holds your own conversations from the last 30 days.</p>
          </>
        }
        actions={
          <>
            <Button variant='outline' onClick={() => setHistoryOpen(true)}>
              <History />
              History
            </Button>
            <Button onClick={startNew} disabled={empty}>
              <Plus />
              New chat
            </Button>
          </>
        }
      />
      <div className='mx-4 mb-1 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground sm:mx-6 dark:text-warning'>
        <TriangleAlert className='mt-px size-3.5 shrink-0' aria-hidden='true' />
        Questions here are real: they count against your daily allowance and appear in the audit log
        under your name.
      </div>

      <div
        ref={thread}
        onScroll={(event) => {
          const element = event.currentTarget;
          pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        }}
        className='min-h-0 flex-1 overflow-y-auto'
      >
        <div className='mx-auto w-full max-w-[820px] px-4 py-6'>
          {empty ? (
            <div className='flex flex-col items-center gap-3 py-16 text-center'>
              <Logo className='size-11' />
              <h2 className='text-lg font-semibold'>Ask about UMCCR documentation</h2>
              <p className='max-w-md text-muted-foreground'>
                OrcaSonar answers from the docs sites and cites the pages it used. Follow-ups carry
                the conversation on.
              </p>
              <div className='flex flex-wrap justify-center gap-2 pt-2'>
                {EXAMPLES.map((example) => (
                  <Button
                    key={example}
                    variant='outline'
                    size='sm'
                    onClick={() => send(example)}
                    disabled={streaming}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <ol className='space-y-6'>
              {reopened !== undefined && saved.isPending && (
                <li className='space-y-3'>
                  <Skeleton className='ms-auto h-10 w-2/3' />
                  <Skeleton className='h-32 w-full' />
                </li>
              )}
              {reopened !== undefined && saved.error && (
                <li>
                  <ErrorState error={saved.error} onRetry={() => void saved.refetch()} />
                </li>
              )}
              {savedTurns?.map((exchange) => (
                <SavedTurn key={exchange.exchangeId} exchange={exchange} />
              ))}
              {state.turns.map((turn) => (
                <LiveTurn key={turn.key} turn={turn} onStop={stop} />
              ))}
            </ol>
          )}
        </div>
      </div>

      <Composer
        key={prefill}
        initial={prefill}
        streaming={streaming}
        followUp={conversationId}
        sites={sites}
        onSites={setSites}
        onSend={send}
        onStop={stop}
        onNew={startNew}
      />
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        activeId={conversationId}
        onPick={pick}
      />
    </div>
  );
}
