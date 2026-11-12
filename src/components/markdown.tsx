import { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AnswerSource } from '@/api/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CITE_HREF, remarkCiteRefs } from '@/lib/cite-refs';
import { docsUrl } from '@/lib/docs-url';
import { cn } from '@/lib/utils';

const REMARK_PLUGINS = [remarkGfm, remarkCiteRefs];

/**
 * An answer's Markdown, built as elements: HTML in it is left out, never inserted into the page. Each `[n]` becomes a
 * chip for the source whose `ref` is n; clicking it calls `onCite`.
 */
export function Markdown({
  text,
  sources,
  onCite,
  images = true,
  className,
}: {
  text: string;
  sources?: readonly AnswerSource[];
  onCite?: (ref: number) => void;
  /** False shows an image as its description, as for a docs page whose image paths are relative to the site. */
  images?: boolean;
  className?: string;
}) {
  const components = useMemo<Components>(() => {
    const byRef = new Map((sources ?? []).map((source) => [source.ref, source]));
    return {
      a: ({ href, children, node: _node, ...props }) => {
        const match = href === undefined ? null : CITE_HREF.exec(href);
        if (match) {
          const ref = Number(match[1]);
          return <CiteChip number={ref} source={byRef.get(ref)} onCite={onCite} />;
        }
        return (
          <a
            {...props}
            href={href === undefined ? undefined : docsUrl(href)}
            target='_blank'
            rel='noreferrer'
          >
            {children}
          </a>
        );
      },
      ...(images
        ? {}
        : {
            img: ({ alt }) => (
              <span className='text-xs text-muted-foreground italic'>
                [image{alt ? `: ${alt}` : ''}]
              </span>
            ),
          }),
    };
  }, [sources, onCite, images]);

  return (
    <div className={cn('markdown', className)}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function CiteChip({
  number,
  source,
  onCite,
}: {
  number: number;
  source: AnswerSource | undefined;
  onCite?: (ref: number) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type='button'
            data-cite={number}
            onClick={() => onCite?.(number)}
            className='mx-0.5 inline-flex h-4 min-w-4 -translate-y-1 items-center justify-center rounded-sm bg-primary/10 px-1 align-baseline text-[10px] leading-none font-semibold text-primary hover:bg-primary/20'
          />
        }
      >
        {number}
      </TooltipTrigger>
      <TooltipContent>{source ? (source.title ?? source.id) : `Source ${number}`}</TooltipContent>
    </Tooltip>
  );
}
