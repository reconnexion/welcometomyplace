import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authProvider } from '../providers';
import useOwnActor from './useOwnActor';
import {
  eventLinkUrl,
  findEventLinkCapability,
  issueEventLinkCapability,
  revokeCapability,
  type Capability
} from '../utils/capability';
import type { EventRecord } from '../types';

/** Resources a holder of the link must be able to read for the event page to render fully —
 *  including the organizer's profile, which is where their display name lives (the actor document
 *  only links to it). Without it the event page shows no organizer at all. */
const grantedResources = (event: EventRecord, webId: string, profileUri?: string) => {
  const image = Array.isArray(event.image) ? event.image[0] : event.image;
  return [
    event.id,
    event.location,
    profileUri,
    // Only if it lives on the organizer's own Pod — they have no control over anything else,
    // so the Pod would refuse to honour the grant anyway
    image?.startsWith(webId) ? image : undefined
  ].filter((uri): uri is string => !!uri);
};

/**
 * The "anyone with the link" state of an event, backed by a Verifiable Credential on the
 * organizer's Pod — the same mechanism as the Pod provider's contact invite links.
 *
 * The credential is minted only when the organizer actually switches general access on, and
 * deleted when they switch it back off, so an event that was never shared publicly carries no
 * credential at all.
 */
const useEventPublicLink = (event: EventRecord) => {
  const session = authProvider.getSession();
  const { data: ownActor } = useOwnActor();
  const queryClient = useQueryClient();
  const queryKey = ['event-public-link', event.id];

  const { data: capability, isLoading } = useQuery<Capability | null>({
    queryKey,
    queryFn: () =>
      findEventLinkCapability({ webId: session!.webId, token: session!.token, eventUri: event.id }),
    enabled: !!session,
    // A failure here (SPARQL endpoint unreachable, credential deleted underneath us) will not
    // fix itself on retry, and the dialog has a sensible empty state, so don't spin on it.
    retry: false
  });

  const setCapability = (next: Capability | null) => queryClient.setQueryData(queryKey, next);

  const { mutateAsync: enable, isPending: isEnabling } = useMutation({
    mutationFn: () =>
      issueEventLinkCapability({
        webId: session!.webId,
        token: session!.token,
        eventUri: event.id,
        accessTo: grantedResources(event, session!.webId, ownActor?.url)
      }),
    onSuccess: setCapability
  });

  const { mutateAsync: disable, isPending: isDisabling } = useMutation({
    mutationFn: async () => {
      if (capability?.id) await revokeCapability(capability.id, session!.token);
    },
    onSuccess: () => setCapability(null)
  });

  const setPublic = useCallback(
    (isPublic: boolean) => (isPublic ? enable() : disable()),
    [enable, disable]
  );

  return {
    isPublic: !!capability,
    link: capability?.id ? eventLinkUrl(event.id, capability.id) : undefined,
    isLoading,
    isSaving: isEnabling || isDisabling,
    setPublic
  };
};

export default useEventPublicLink;
