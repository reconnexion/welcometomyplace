import { useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchJson, normalizeRecord } from '@activitypods/refine-providers/utils';

import { capabilityToken, type Capability } from '../utils/capability';
import { forgetEventLinks, getEventLinks } from '../utils/eventLinks';
import type { EventRecord } from '../types';

export type LinkedEvent = { event: EventRecord; capability: Capability; capabilityUri: string };

const isGone = (error: any) => [401, 403, 404, 410].includes(error?.status);

/**
 * Events opened through a public link in this browser, read with that link's credential. Those
 * already in `ownEventIds` (the user joined them since, or organizes them) are left out and
 * forgotten, as are those whose link has been revoked.
 */
const useLinkedEvents = (ownEventIds?: string[]) => {
  const links = useMemo(() => Object.entries(getEventLinks()), []);
  const pending = ownEventIds ? links.filter(([eventUri]) => !ownEventIds.includes(eventUri)) : [];

  useEffect(() => {
    if (ownEventIds) forgetEventLinks(links.map(([eventUri]) => eventUri).filter(uri => ownEventIds.includes(uri)));
  }, [ownEventIds, links]);

  const queries = useQueries({
    queries: pending.map(([eventUri, capabilityUri]) => ({
      queryKey: ['linked-event', eventUri, capabilityUri],
      queryFn: async (): Promise<LinkedEvent | null> => {
        try {
          const { json: capability } = await fetchJson(capabilityUri);
          const { json } = await fetchJson(eventUri, {}, capabilityToken(capability));
          return { event: normalizeRecord(json, json['@context']) as unknown as EventRecord, capability, capabilityUri };
        } catch (e) {
          if (!isGone(e)) throw e;
          forgetEventLinks([eventUri]);
          return null;
        }
      },
      retry: false
    }))
  });

  return queries.map(query => query.data).filter((linked): linked is LinkedEvent => !!linked);
};

export default useLinkedEvents;
