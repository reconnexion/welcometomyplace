import { useCallback } from 'react';

import { dataProvider } from '../providers';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const hasAllPredicates = (record: Record<string, any>, predicates: string[]) => predicates.every(p => record[p]);

/** Polls a just-created record until the backend's async post-processing (status tagging,
 *  attendees collection creation, etc.) has landed — see `EventCreatePage`, which shows a
 *  loading screen while this runs rather than redirecting to a show page missing those fields. */
const useWaitForPredicates = () => {
  return useCallback(async (resource: string, record: Record<string, any>, predicates: string[]) => {
    let current = record;
    let attempt = 0;
    while (!hasAllPredicates(current, predicates)) {
      attempt++;
      if (attempt > 30) return current;
      await delay(1000);
      const { data } = await dataProvider.getOne({ resource, id: current.id });
      current = data as Record<string, any>;
    }
    return current;
  }, []);
};

export default useWaitForPredicates;
