import { Waves } from 'lucide-react';
import { cn } from '@/lib/utils';

/** OrcaSonar's mark: sonar waves on a Signal Blue tile. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden='true'
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground',
        className
      )}
    >
      <Waves className='size-[55%]' strokeWidth={2.25} />
    </span>
  );
}
