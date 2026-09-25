import { useOne } from '@refinedev/core';

import useOwnActor from './useOwnActor';
import type { ProfileRecord } from '../types';

/** The logged-in user's own Profile record (`actor.url` on the WebID document points to it). */
const useOwnProfile = () => {
  const { data: ownActor, isLoading: isActorLoading } = useOwnActor();

  const { result, query } = useOne<ProfileRecord>({
    resource: 'profile',
    id: ownActor?.url,
    queryOptions: { enabled: !!ownActor?.url }
  });

  return { data: result, isLoading: isActorLoading || query.isLoading };
};

export default useOwnProfile;
