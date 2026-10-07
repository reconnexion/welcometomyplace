import { arrayOf } from '@activitypods/refine-providers/utils';
import type { EventRecord } from '../types';

const isPast = (date?: string) => !!date && new Date(date).getTime() < Date.now();

/** An event is finished once its `endTime` is past, whatever its `apods:hasStatus` says: the
 *  status is switched by a backend timer, and copies held by invitees (or events whose timer
 *  was lost) can lag behind. */
export const isEventFinished = (event: EventRecord) =>
  isPast(event.endTime) || arrayOf(event['apods:hasStatus']).includes('apods:Finished');

/** Closed = the organizer closed registrations (max attendees reached, or `apods:closingTime`
 *  past). Same reasoning as above for the closing time. */
export const isEventClosed = (event: EventRecord) =>
  isPast(event['apods:closingTime']) || arrayOf(event['apods:hasStatus']).includes('apods:Closed');
