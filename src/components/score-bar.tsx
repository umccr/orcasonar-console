import { cn } from '@/lib/utils';

/** A retrieval score from 0 to 1, as a bar and its value. */
export function ScoreBar({
  score,
  muted,
  className,
}: {
  score: number;
  muted?: boolean;
  className?: string;
}) {
  const width = `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%`;
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-2', className)}
      title={`Score ${score.toFixed(3)}`}
    >
      <span className='h-1.5 w-14 overflow-hidden rounded-full bg-muted'>
        <span
          className={cn(
            'block h-full rounded-full',
            muted ? 'bg-muted-foreground/40' : 'bg-primary'
          )}
          style={{ width }}
        />
      </span>
      <span
        className={cn(
          'w-8 text-end text-xs font-medium tabular-nums',
          muted && 'text-muted-foreground'
        )}
      >
        {score.toFixed(2)}
      </span>
    </span>
  );
}

/** A docs site's slug, such as `platform`. */
export function SiteChip({ site, className }: { site: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm bg-muted px-1.5 py-px text-[10px] font-semibold tracking-wide text-muted-foreground uppercase',
        className
      )}
    >
      {site}
    </span>
  );
}
