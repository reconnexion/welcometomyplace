import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { fetchJson } from '@activitypods/refine-providers/utils';

import { getCurrentCapability, setCurrentCapability, type Capability } from '../utils/capability';

/**
 * Loads the credential referenced by the `?cap=` search param — the one carried by a public event
 * link — and registers it so the data provider can read Pod resources through it.
 *
 * `ready` stays false until that has happened, so callers can hold their queries back: a read
 * fired before the capability is in place would get a 401 that react-query then caches as a
 * failure, leaving the page permanently empty for a logged-out visitor.
 */
const useCapability = () => {
  const [searchParams] = useSearchParams();
  const capabilityUri = searchParams.get('cap') || undefined;

  const [capability, setCapability] = useState<Capability | undefined>(() =>
    getCurrentCapability(capabilityUri)
  );
  const [ready, setReady] = useState(!capabilityUri || !!getCurrentCapability(capabilityUri));
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    if (!capabilityUri) {
      setCurrentCapability(undefined);
      setCapability(undefined);
      setReady(true);
      return;
    }

    const known = getCurrentCapability(capabilityUri);
    if (known) {
      setCapability(known);
      setReady(true);
      return;
    }

    let cancelled = false;
    // The credential itself is world-readable (its URI is the unguessable part), so no token here
    fetchJson(capabilityUri)
      .then(({ json }) => {
        if (cancelled) return;
        setCurrentCapability(capabilityUri, json);
        setCapability(json);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [capabilityUri]);

  return { capabilityUri, capability, ready, error };
};

export default useCapability;
