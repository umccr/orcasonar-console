/** Times show in Melbourne, where the team and the budget's day are; UTC shows on hover. */
export const TIME_ZONE = 'Australia/Melbourne';
const LOCALE = 'en-AU';

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });

/** `194,220` */
export const formatInteger = (value: number): string => integer.format(value);

/** `14.8k`: for token counts where the exact figure is on hover. */
export const formatCompact = (value: number): string =>
  Math.abs(value) < 1000 ? integer.format(value) : compact.format(value).toLowerCase();

const usdFormats = new Map<number, Intl.NumberFormat>();

/** `$0.0213`: US dollars, to the given decimals. */
export const formatUsd = (usd: number, digits = 2): string => {
  let format = usdFormats.get(digits);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    usdFormats.set(digits, format);
  }
  return `$${format.format(usd)}`;
};

/** `86%` */
export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** `412 ms`, `6.4 s`, `6 min`, `1.5 h` */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)} s`;
  }
  if (ms < 3_600_000) {
    return `${Math.round(ms / 60_000)} min`;
  }
  return `${(ms / 3_600_000).toFixed(1)} h`;
};

/** `6 h 12 min`: how long until a time `seconds` from now, to the minute. */
export const formatWait = (seconds: number): string => {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest} min`;
  }
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

const dateTime = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const fullDateTime = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const fullDate = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const clock = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const clockSeconds = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
// en-CA writes dates as YYYY-MM-DD, which sorts and compares as text.
const day = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const toDate = (time: string | number | Date) => (time instanceof Date ? time : new Date(time));

/** `5 Nov, 14:32` */
export const formatDateTime = (time: string | number | Date): string =>
  dateTime.format(toDate(time));

/** `5 Nov 2026, 14:32` */
export const formatFullDateTime = (time: string | number | Date): string =>
  fullDateTime.format(toDate(time));

/** `28 Oct 2026` */
export const formatDate = (time: string | number | Date): string => fullDate.format(toDate(time));

/** `14:32` */
export const formatClock = (time: string | number | Date): string => clock.format(toDate(time));

/** `14:32:05` */
export const formatClockSeconds = (time: string | number | Date): string =>
  clockSeconds.format(toDate(time));

/** `2026-11-05 03:32:05 UTC` */
export const formatUtc = (time: string | number | Date): string =>
  `${toDate(time).toISOString().slice(0, 19).replace('T', ' ')} UTC`;

/** The Melbourne day a time falls on, as `2026-11-05`. */
export const melbourneDay = (time: string | number | Date): string => day.format(toDate(time));

/** `just now`, `12 min ago`, `2 h ago`, `3 d ago` */
export const formatRelative = (time: string | number | Date, now: number = Date.now()): string => {
  const seconds = Math.max(0, Math.round((now - toDate(time).getTime()) / 1000));
  if (seconds < 60) {
    return 'just now';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }
  return `${Math.floor(hours / 24)} d ago`;
};

/** `c_3f9a…c21d`: an OrcaSonar ID's prefix with its first and last four characters. */
export const shortId = (id: string): string => {
  const match = /^([a-z]+_)([0-9a-f]{4})[0-9a-f]{2,}([0-9a-f]{4})$/.exec(id);
  return match ? `${match[1]}${match[2]}…${match[3]}` : id;
};

/** `AR` for `a.reader@umccr.org`: the initials of an email's name. */
export const initials = (email: string | undefined): string => {
  const name = email?.split('@')[0] ?? '';
  const parts = name.split(/[._+-]+/).filter(Boolean);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1) ?? '') : first.slice(1);
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
};

/** `3 questions`, `1 question` */
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${formatInteger(count)} ${count === 1 ? one : many}`;
