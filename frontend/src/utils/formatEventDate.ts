import { APP_LANG } from '../config/env';

/** Matches the old app's `DateField` options: e.g. "Sat, June 14, 6:00 PM". */
export const formatEventDateTime = (value: string): string =>
  new Intl.DateTimeFormat(APP_LANG, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));

export const formatFullDateTime = (value: string): string =>
  new Intl.DateTimeFormat(APP_LANG, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
