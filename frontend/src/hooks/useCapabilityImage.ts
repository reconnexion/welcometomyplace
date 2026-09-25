import { useEffect, useState } from 'react';

import { fetchWithCapability, type Capability } from '../utils/capability';

/**
 * Resolve an image URL that may sit behind a capability. A plain `<img src>` cannot send an
 * `Authorization` header, so for a logged-out visitor reading through a public event link the
 * image has to be fetched here and handed over as a blob URL — the same workaround the
 * ActivityPods invite page uses for profile photos.
 *
 * With no capability in play (an ordinary logged-in visitor, whose cookies-free requests are
 * authorized by their own session anyway) the URL is returned untouched.
 */
const useCapabilityImage = (imageUrl?: string, capability?: Capability) => {
  const [resolved, setResolved] = useState<string | undefined>(capability ? undefined : imageUrl);

  useEffect(() => {
    if (!imageUrl || !capability) {
      setResolved(imageUrl);
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    fetchWithCapability(imageUrl, capability)
      .then(response => (response.ok ? response.blob() : undefined))
      .then(blob => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved(objectUrl);
      })
      .catch(() => {
        // The link may not grant access to the image: just show the page without it
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl, capability]);

  return resolved;
};

export default useCapabilityImage;
