import type { Root } from 'mdast';
import { findAndReplace } from 'mdast-util-find-and-replace';

/** The href a citation marker gets, from which the renderer knows to draw a chip rather than a link. */
export const CITE_HREF = /^#cite-(\d+)$/;

/**
 * A remark plugin that turns each `[n]` in an answer's text into a link to `#cite-n`, for the renderer to show as the
 * citation chip for the source whose `ref` is n. Code and existing links are left alone.
 */
export function remarkCiteRefs() {
  return (tree: Root) => {
    findAndReplace(
      tree,
      [
        /\[(\d{1,2})\]/g,
        (_match: string, ref: string) => ({
          type: 'link',
          url: `#cite-${ref}`,
          children: [{ type: 'text', value: ref }],
        }),
      ],
      { ignore: ['link', 'linkReference'] }
    );
  };
}
