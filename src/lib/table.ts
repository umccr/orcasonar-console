/** The page sizes the audit tables offer. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;

/** Column settings shared by the tables: numbers right-aligned, in tabular figures. */
export const NUMERIC_COLUMN = {
  headerClassName: 'text-end [&>div]:ms-0 [&>div]:-me-2 [&>div]:justify-end',
  cellClassName: 'text-end tabular-nums',
} as const;
