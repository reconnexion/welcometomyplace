import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@activitypods/refine-providers/utils';

import { authProvider } from '../providers';

/**
 * Fetch the logged-in user's own ActivityPub actor document (the WebID document itself), which
 * carries properties like `outbox`, `inbox`, and `apods:contacts` — none of which are exposed by
 * `authProvider.getIdentity()` (which only returns `{ id, name, avatar }`).
 */
const useOwnActor = () => {
  const session = authProvider.getSession();

  return useQuery({
    queryKey: ['own-actor', session?.webId],
    queryFn: async () => {
      const { json } = await fetchJson(session!.webId, {}, session!.token);
      return json as Record<string, any>;
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000
  });
};

export default useOwnActor;
