import type { AnswerSource } from '@/api/types';
import { docsUrl } from '@/lib/docs-url';
import { cn } from '@/lib/utils';
import { ScoreBar, SiteChip } from './score-bar';

/** The pages an answer cites, numbered as it cites them. */
export function AnswerSources({
  sources,
  highlighted,
  className,
}: {
  sources: readonly AnswerSource[];
  /** The `ref` of a source to pick out, as when its chip was clicked. */
  highlighted?: number;
  className?: string;
}) {
  const ordered = [...sources].sort((a, b) => a.ref - b.ref);
  return (
    <ol className={cn('divide-y overflow-hidden rounded-lg border bg-card', className)}>
      {ordered.map((source) => (
        <li
          key={`${source.ref}-${source.id}`}
          className={cn(
            'flex items-center gap-3 px-3 py-2 transition-colors',
            highlighted === source.ref && 'bg-primary/5'
          )}
        >
          <span className='flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-[11px] font-semibold text-primary'>
            {source.ref}
          </span>
          <div className='min-w-0 flex-1'>
            <a
              href={docsUrl(source.url)}
              target='_blank'
              rel='noreferrer'
              className='block truncate font-medium hover:text-primary hover:underline'
            >
              {source.title ?? source.url}
            </a>
            <div className='flex min-w-0 items-center gap-2 text-xs text-muted-foreground'>
              {source.site && <SiteChip site={source.site} />}
              <span className='truncate font-mono text-[11px]'>{source.id}</span>
            </div>
          </div>
          <ScoreBar score={source.score} />
        </li>
      ))}
    </ol>
  );
}
