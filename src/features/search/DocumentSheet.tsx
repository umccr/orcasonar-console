import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useDocument } from '@/api/queries';
import { ErrorState } from '@/components/error-state';
import { Markdown } from '@/components/markdown';
import { SiteChip } from '@/components/score-bar';
import { TimeText } from '@/components/time-text';
import { buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { docsUrl } from '@/lib/docs-url';

export interface DocumentTarget {
  readonly id: string;
  readonly title?: string;
  /** The passage that matched, to show above the page. */
  readonly snippet?: string;
}

/** A docs page as OrcaSonar holds it, beside the search that found it. */
export function DocumentSheet({
  target,
  onClose,
}: {
  target: DocumentTarget | undefined;
  onClose: () => void;
}) {
  // Kept while the sheet slides shut, so it doesn't empty as it goes.
  const [last, setLast] = useState(target);
  if (target !== undefined && target !== last) {
    setLast(target);
  }
  const shown = target ?? last;
  const page = useDocument(shown?.id);
  const updated = page.data?.updated;

  return (
    <Sheet
      open={target !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent side='right' className='w-full gap-0 p-0 data-[side=right]:sm:max-w-[600px]'>
        <SheetHeader className='gap-1.5 border-b px-6 py-4 pe-14'>
          <SheetTitle className='text-base font-semibold'>
            {page.data?.title ?? shown?.title ?? 'Page'}
          </SheetTitle>
          <SheetDescription className='flex flex-wrap items-center gap-2'>
            {page.data?.site && <SiteChip site={page.data.site} />}
            <span className='font-mono text-xs'>{shown?.id}</span>
            {updated && !Number.isNaN(Date.parse(updated)) && (
              <span>
                Updated <TimeText value={updated} format='date' />
              </span>
            )}
          </SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5'>
          {shown?.snippet && (
            <div className='rounded-lg border-s-4 border-primary bg-primary/5 px-4 py-3'>
              <div className='mb-1 text-[11px] font-semibold tracking-[0.08em] text-primary uppercase'>
                Matched passage
              </div>
              <p className='text-sm'>{shown.snippet}</p>
            </div>
          )}
          {page.isPending ? (
            <div className='space-y-2'>
              <Skeleton className='h-4 w-1/2' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-5/6' />
              <Skeleton className='h-4 w-2/3' />
            </div>
          ) : page.error ? (
            <ErrorState error={page.error} onRetry={() => void page.refetch()} />
          ) : (
            <Markdown text={page.data.markdown} images={false} />
          )}
        </div>
        <SheetFooter className='flex-row justify-end border-t px-6 py-3'>
          {page.data && (
            <a
              href={docsUrl(page.data.url)}
              target='_blank'
              rel='noreferrer'
              className={buttonVariants({ variant: 'outline' })}
            >
              <ExternalLink />
              Open on the docs site
            </a>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
