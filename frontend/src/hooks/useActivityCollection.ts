import { useQuery, useQueryClient } from '@tanstack/react-query';
import { arrayOf, fetchJson } from '@activitypods/refine-providers/utils';

import { authProvider } from '../providers';
import { getCurrentCapabilityToken } from '../utils/capability';
import useOwnActor from './useOwnActor';

// A stable reference for "no items yet" — `?? []` would create a new array on every call, which
// breaks anything depending on referential stability (e.g. ShareDialog's `useEffect(() => {...},
// [announces, announcers])`, which would then re-run — and reset in-progress toggle state — on
// every render instead of only when the collection's actual contents change).
const EMPTY_ITEMS: string[] = [];

/**
 * Read an ActivityPub (Ordered)Collection: either a full URI, or a predicate (e.g.
 * `apods:contacts`) resolved against the logged-in user's own actor document — mirrors
 * `@semapps/activitypub-components`'s `useCollection`, minus the infinite-scroll/live-update
 * machinery this app doesn't need (attendee/announce/contact lists here are small and bounded:
 * a single page fetch is enough, following the collection's `first` page if it has one).
 */
const useActivityCollection = (predicateOrUri?: string) => {
  const { data: ownActor } = useOwnActor();
  // Falls back to a public event link's credential, so a logged-out visitor reads what the link
  // grants. Several of these collections are public anyway (`apods:attendees` carries
  // `acl:agentClass foaf:Agent`), which is why the query must run with no token at all too.
  const token = authProvider.getSession()?.token ?? getCurrentCapabilityToken();
  const queryClient = useQueryClient();

  const isUri = predicateOrUri?.startsWith('http');
  const collectionUri = isUri ? predicateOrUri : predicateOrUri ? ownActor?.[predicateOrUri] : undefined;

  const queryKey = ['activity-collection', collectionUri, !!token];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      let { json } = await fetchJson(collectionUri!, {}, token);

      if ((json.type === 'OrderedCollection' || json.type === 'Collection') && json.first) {
        const firstItems = json.first?.items || json.first?.orderedItems;
        if (!firstItems) {
          ({ json } = await fetchJson(typeof json.first === 'string' ? json.first : json.first.id, {}, token));
        } else {
          json = json.first;
        }
      }

      const items: string[] = arrayOf(json.orderedItems || json.items).map((item: any) => item.id || item);
      return items;
    },
    // Deliberately not gated on having a session: the attendee list is world-readable, so a
    // logged-out visitor following a public event link must still get it. A collection that is
    // not readable simply 403s, and `retry: false` below keeps that cheap.
    enabled: !!collectionUri,
    // A permission-denied fetch (e.g. ShareButton probing whether the viewer can read
    // apods:announces to decide whether to show itself) will never succeed on retry — the
    // default 3 retries with backoff just delays the error (and whatever hides on it) for
    // several seconds with nothing to show for it.
    retry: false
  });

  return {
    items: query.data ?? EMPTY_ITEMS,
    isLoading: query.isLoading,
    error: query.error,
    // Distinct from `!isLoading && !error`: a disabled query (falsy/undefined collectionUri)
    // also has isLoading:false and error:undefined despite never having run, so callers that
    // need to positively confirm read access (e.g. ShareButton deciding whether to show itself)
    // must check this instead — the safe default is "not confirmed", not "no error seen yet".
    isSuccess: query.isSuccess,
    refetch: query.refetch,
    url: collectionUri,
    /** Optimistically add an item to the cached collection, without waiting for a refetch. */
    addItem: (item: string) => {
      queryClient.setQueryData<string[]>(queryKey, old => (old ? [item, ...old] : [item]));
    },
    /** Optimistically remove an item from the cached collection, without waiting for a refetch. */
    removeItem: (item: string) => {
      queryClient.setQueryData<string[]>(queryKey, old => old?.filter(i => i !== item));
    }
  };
};

export default useActivityCollection;
