/**
 * Public event links opened in this browser, so that the events they lead to can be listed with
 * the user's own. Kept locally: holding a link doesn't make someone a guest, and the event lands
 * in their Pod only once they join it.
 */
const STORAGE_KEY = 'wtmp.eventLinks';

/** Event URI → URI of the credential behind its public link */
export type EventLinks = Record<string, string>;

export const getEventLinks = (): EventLinks => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

const setEventLinks = (links: EventLinks) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch {}
};

export const rememberEventLink = (eventUri: string, capabilityUri: string) => {
  const links = getEventLinks();
  if (links[eventUri] !== capabilityUri) setEventLinks({ ...links, [eventUri]: capabilityUri });
};

export const forgetEventLinks = (eventUris: string[]) => {
  const links = getEventLinks();
  const remaining = Object.fromEntries(Object.entries(links).filter(([eventUri]) => !eventUris.includes(eventUri)));
  if (Object.keys(remaining).length !== Object.keys(links).length) setEventLinks(remaining);
};
