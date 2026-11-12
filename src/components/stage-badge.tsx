import { STAGE } from '@/lib/stage';
import { cn } from '@/lib/utils';

/*
 * Where the console runs, in the colours the portal's apps use for it (orca-ui-v2's DESIGN.md): violet for local, Signal
 * Blue for dev, where OrcaSonar's beta runs, and emerald for prod. They say where you are, not how something went.
 */
const STAGES = {
  local: {
    label: 'Local',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  },
  beta: {
    label: 'Beta',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  },
  prod: {
    label: 'Prod',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
} as const;

export function StageBadge({ className }: { className?: string }) {
  if (STAGE === undefined) {
    return null;
  }
  const { label, className: colours } = STAGES[STAGE];
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase',
        colours,
        className
      )}
    >
      {label}
    </span>
  );
}
