import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { useNavigate, useSearchParams } from 'react-router';
import { App, Button, type ButtonProps } from 'antd';

import useOutbox from '../../hooks/useOutbox';
import useActivityCollection from '../../hooks/useActivityCollection';
import useCapability from '../../hooks/useCapability';
import { authProvider } from '../../providers';
import { createPresentation } from '../../utils/capability';
import { arrayOf } from '@activitypods/refine-providers/utils';
import type { EventRecord, Identity } from '../../types';

type Props = ButtonProps & {
  event: EventRecord;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Posts `Join`/`Leave` AS2 activities to the organizer, addressed via the logged-in user's own
 *  outbox. `apods:attendees` (read through `useActivityCollection`) is the source of truth for
 *  whether the viewer is currently attending — shared with EventShowPage's attendee grid via the
 *  same react-query cache key, so refetching it here also updates that grid.
 *
 *  A visitor who arrived through a public event link (`?cap=`) is not in `apods:announces`, so
 *  their `Join` carries the credential from that link as proof they may register anyway. It goes
 *  along twice, on purpose:
 *  - `capability`, a presentation signed against a challenge from the organizer's Pod, which that
 *    Pod verifies on receipt (proof the sender really holds the credential);
 *  - `instrument`, the credential's plain URI, because `capability` is not an ActivityStreams
 *    term and so does not survive being stored in the Pod's triplestore — and the app backend,
 *    which is what actually decides whether to accept the registration, reads the activity back
 *    from the Pod rather than seeing the original request. */
const JoinButton = ({ event, ...buttonProps }: Props) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { data: identity } = useGetIdentity<Identity>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { capability, capabilityUri } = useCapability();
  const outbox = useOutbox();
  const { items: attendees, isLoading: attendeesLoading, refetch } = useActivityCollection(event['apods:attendees']);
  const [pending, setPending] = useState(false);
  const [joined, setJoined] = useState(false);

  const session = authProvider.getSession();

  useEffect(() => {
    setJoined(attendees.includes(identity?.id ?? ''));
  }, [attendees, identity]);

  const isOrganizer = event['dc:creator'] === identity?.id;
  const status = arrayOf(event['apods:hasStatus']);
  const isClosed = status.includes('apods:Closed');
  const isFinished = status.includes('apods:Finished');

  // The organizer's Pod processes Join/Leave asynchronously (real ActivityPub delivery to their
  // inbox, then a collection update) — a single refetch after a fixed delay risks running before
  // that's landed, leaving the attendee list looking stale with nothing to retry it. Poll instead,
  // until the collection actually reflects the expected membership (or we give up).
  const waitForAttendeeUpdate = async (expectMember: boolean) => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await delay(1000);
      const { data } = await refetch();
      if ((data ?? []).includes(identity?.id ?? '') === expectMember) return;
    }
  };

  const post = async (type: 'Join' | 'Leave') => {
    setPending(true);
    try {
      let credentials = {};
      if (type === 'Join' && capability && capabilityUri && session) {
        const presentation = await createPresentation({
          token: session.token,
          holder: session.webId,
          verifier: event['dc:creator'],
          verifiableCredential: capability
        });
        credentials = { capability: presentation, instrument: capabilityUri };
      }

      await outbox.post({
        type,
        actor: outbox.owner,
        object: event.id,
        to: event['dc:creator'],
        ...credentials
      });
      message.success(t(type === 'Join' ? 'event.event_joined' : 'event.event_left'));
      setJoined(type === 'Join');
      waitForAttendeeUpdate(type === 'Join');
    } catch (e: any) {
      message.error(e.message);
    }
    setPending(false);
  };

  /** A visitor who followed a public link is sent off to create an account, and comes back here
   *  with `?join=true` — at which point the registration they asked for is sent for them. */
  const signupThenJoin = () => {
    const params = new URLSearchParams();
    if (capabilityUri) params.set('cap', capabilityUri);
    params.set('join', 'true');
    const redirect = `/events/${encodeURIComponent(event.id)}?${params.toString()}`;
    navigate(`/signup?redirect=${encodeURIComponent(redirect)}`);
  };

  const autoJoinDone = useRef(false);
  useEffect(() => {
    if (autoJoinDone.current || searchParams.get('join') !== 'true') return;
    // Wait until we know whether they are already an attendee (or a page reload would rejoin),
    // and until the outbox URI has been read off their actor document — posting before that
    // throws, and this is the one code path nobody clicks to retry.
    if (!session || !identity || attendeesLoading || !outbox.url) return;

    autoJoinDone.current = true;

    // Drop the flag first: the join is fire-and-forget from here, and leaving it in the URL would
    // replay it on every reload of what is otherwise an ordinary event page.
    const next = new URLSearchParams(searchParams);
    next.delete('join');
    setSearchParams(next, { replace: true });

    if (!joined && !isOrganizer && !isClosed && !isFinished) post('Join');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, identity, attendeesLoading, outbox.url, searchParams]);

  if (!session) {
    return (
      <Button onClick={signupThenJoin} disabled={isClosed || isFinished} {...buttonProps}>
        {t('event.join')}
      </Button>
    );
  }

  return joined ? (
    <Button
      onClick={() => post('Leave')}
      disabled={pending || isOrganizer || isFinished}
      {...buttonProps}
    >
      {t('event.leave')}
    </Button>
  ) : (
    <Button
      onClick={() => post('Join')}
      disabled={pending || isOrganizer || isClosed || isFinished}
      {...buttonProps}
    >
      {t('event.join')}
    </Button>
  );
};

export default JoinButton;
