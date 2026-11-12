import { useState } from 'react';
import { ArrowUp, CircleStop } from 'lucide-react';
import { CopyId } from '@/components/copy-id';
import { SitesPicker } from '@/components/sites-picker';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';

/** OrcaSonar takes questions of up to 2,000 characters. */
export const MAX_QUESTION = 2000;

/** Where a question is written: Enter sends it, Shift+Enter starts a new line. */
export function Composer({
  initial,
  streaming,
  followUp,
  sites,
  onSites,
  onSend,
  onStop,
  onNew,
}: {
  initial: string;
  streaming: boolean;
  /** The conversation the next question follows up, if any. */
  followUp: string | undefined;
  sites: readonly string[];
  onSites: (sites: string[]) => void;
  onSend: (question: string) => void;
  onStop: () => void;
  onNew: () => void;
}) {
  const [text, setText] = useState(initial);
  const question = text.trim();
  const tooLong = text.length > MAX_QUESTION;
  const canSend = question !== '' && !tooLong && !streaming;

  const send = () => {
    if (canSend) {
      onSend(question);
      setText('');
    }
  };

  return (
    <div className='border-t bg-background/95 px-4 pt-3 pb-4 backdrop-blur-sm'>
      <div className='mx-auto w-full max-w-[820px] space-y-2'>
        <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
          {followUp ? (
            <span className='flex items-center gap-1.5'>
              Follow-up in <CopyId id={followUp} /> ·
              <button type='button' onClick={onNew} className='text-primary hover:underline'>
                Start a new conversation
              </button>
            </span>
          ) : (
            <span>A new conversation</span>
          )}
          <span className='hidden items-center gap-1 sm:flex'>
            <Kbd>Enter</Kbd> to send · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> for a new line
          </span>
        </div>
        <InputGroup className='bg-card'>
          <InputGroupTextarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            placeholder='Ask about UMCCR documentation…'
            aria-label='Your question'
            rows={2}
            className='max-h-48 min-h-14'
          />
          <InputGroupAddon align='block-end' className='gap-2'>
            <SitesPicker value={sites} onChange={onSites} />
            <span
              className={cn(
                'ms-auto text-xs tabular-nums',
                tooLong ? 'font-semibold text-destructive' : 'text-muted-foreground'
              )}
            >
              {formatInteger(text.length)} / {formatInteger(MAX_QUESTION)}
            </span>
            {streaming ? (
              <InputGroupButton variant='outline' size='sm' className='h-8 px-3' onClick={onStop}>
                <CircleStop />
                Stop
              </InputGroupButton>
            ) : (
              <InputGroupButton
                variant='default'
                size='icon-sm'
                className='rounded-full'
                disabled={!canSend}
                onClick={send}
                aria-label='Send'
              >
                <ArrowUp />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
