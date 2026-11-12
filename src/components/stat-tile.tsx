import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** One figure for the window, with a line saying what it covers. */
export function StatTile({
  label,
  value,
  hint,
  loading,
  missing,
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  /** True when the figure couldn't be loaded: it shows as a dash rather than as a zero. */
  missing?: boolean;
  children?: ReactNode;
}) {
  return (
    <Card className='min-w-0 gap-2 px-5 py-4'>
      <div className='text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase'>
        {label}
      </div>
      {loading ? (
        <Skeleton className='h-8 w-24' />
      ) : (
        <div className='text-[28px] leading-9 font-bold tracking-tight tabular-nums'>
          {missing ? '–' : value}
        </div>
      )}
      {!loading && !missing && children}
      {hint && !missing && <div className='truncate text-xs text-muted-foreground'>{hint}</div>}
    </Card>
  );
}

/** How the questions ended: a stacked bar of answered, not covered and failed, with each count. */
export function OutcomeBar({
  answered,
  notCovered,
  failed,
}: {
  answered: number;
  notCovered: number;
  failed: number;
}) {
  const total = answered + notCovered + failed;
  const parts = [
    { label: 'answered', count: answered, className: 'bg-success' },
    { label: 'not covered', count: notCovered, className: 'bg-warning' },
    { label: 'failed', count: failed, className: 'bg-destructive' },
  ];
  return (
    <div className='space-y-1.5'>
      <div className='flex h-2 overflow-hidden rounded-full bg-muted'>
        {total > 0 &&
          parts.map((part) => (
            <span
              key={part.label}
              className={part.className}
              style={{ width: `${(part.count / total) * 100}%` }}
            />
          ))}
      </div>
      <div className='flex justify-between text-xs text-muted-foreground tabular-nums'>
        {parts.map((part) => (
          <span key={part.label} className='flex items-center gap-1' title={part.label}>
            <span className={`size-1.5 rounded-full ${part.className}`} />
            {part.count} {part.label}
          </span>
        ))}
      </div>
    </div>
  );
}
