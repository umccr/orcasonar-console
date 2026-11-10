import {
  formatClock,
  formatClockSeconds,
  formatDate,
  formatDateTime,
  formatFullDateTime,
  formatRelative,
  formatUtc,
} from '@/lib/format';

const FORMATS = {
  datetime: formatDateTime,
  full: formatFullDateTime,
  date: formatDate,
  clock: formatClock,
  seconds: formatClockSeconds,
  relative: (value: string) => formatRelative(value),
} as const;

/** A time in Melbourne, with UTC on hover. */
export function TimeText({
  value,
  format = 'datetime',
  className,
}: {
  value: string;
  format?: keyof typeof FORMATS;
  className?: string;
}) {
  return (
    <time dateTime={value} title={formatUtc(value)} className={className}>
      {FORMATS[format](value)}
    </time>
  );
}
