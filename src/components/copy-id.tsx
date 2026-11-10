import { Copy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { copyText } from '@/lib/clipboard';
import { shortId } from '@/lib/format';
import { cn } from '@/lib/utils';

/** An ID, shortened, that copies itself in full when clicked. */
export function CopyId({
  id,
  full,
  className,
}: {
  id: string;
  full?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type='button'
            onClick={(event) => {
              // Rows open when clicked; copying an ID in one shouldn't.
              event.stopPropagation();
              void copyText(id);
            }}
            className={cn(
              'inline-flex max-w-full items-center gap-1 rounded-sm font-mono text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
              className
            )}
          />
        }
      >
        <span className='truncate'>{full ? id : shortId(id)}</span>
        <Copy className='size-3 shrink-0 opacity-60' aria-hidden='true' />
      </TooltipTrigger>
      <TooltipContent>Copy {id}</TooltipContent>
    </Tooltip>
  );
}
