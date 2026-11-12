import { CalendarDays } from 'lucide-react';
import type { AuditOutcome } from '@/api/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isRange, RANGE_LABELS, RANGES, type Range } from '@/lib/window';
import { isOutcome, OUTCOME_LABELS } from '@/lib/outcomes';

const RANGE_ITEMS = RANGES.map((value) => ({ value, label: RANGE_LABELS[value] }));

/** The audit window, as one of the ranges up to now. */
export function WindowSelect({
  value,
  onChange,
}: {
  value: Range;
  onChange: (range: Range) => void;
}) {
  return (
    <Select
      items={RANGE_ITEMS}
      value={value}
      onValueChange={(next) => {
        if (isRange(next)) {
          onChange(next);
        }
      }}
    >
      <SelectTrigger className='h-9 min-w-40 bg-card' aria-label='Window'>
        <CalendarDays className='text-muted-foreground' aria-hidden='true' />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGE_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const ALL = 'all';
const OUTCOME_ITEMS = [
  { value: ALL, label: 'All outcomes' },
  ...(Object.keys(OUTCOME_LABELS) as AuditOutcome[]).map((value) => ({
    value,
    label: OUTCOME_LABELS[value],
  })),
];

/** Only exchanges that ended one way, or conversations with at least one that did. */
export function OutcomeSelect({
  value,
  onChange,
}: {
  value: AuditOutcome | undefined;
  onChange: (outcome: AuditOutcome | undefined) => void;
}) {
  return (
    <Select
      items={OUTCOME_ITEMS}
      value={value ?? ALL}
      onValueChange={(next) => onChange(isOutcome(next) ? next : undefined)}
    >
      <SelectTrigger className='h-9 min-w-36 bg-card' aria-label='Outcome'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OUTCOME_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
