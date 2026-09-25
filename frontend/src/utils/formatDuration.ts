import type { TFunction } from 'i18next';

/** "2 days, 3 hours, 15 minutes" between two ISO date strings, using the pluralized `time.*` keys. */
const formatDuration = (startTime: string, endTime: string, t: TFunction): string | undefined => {
  let seconds = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  hours = hours - days * 24;
  minutes = minutes - days * 24 * 60 - hours * 60;

  const parts: string[] = [];
  if (days) parts.push(t('time.days', { count: days }));
  if (hours) parts.push(t('time.hours', { count: hours }));
  if (minutes) parts.push(t('time.minutes', { count: minutes }));

  return parts.length > 0 ? parts.join(', ') : undefined;
};

export default formatDuration;
