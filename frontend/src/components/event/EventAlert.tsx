import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Alert } from 'antd';
import { arrayOf } from '@activitypods/refine-providers/utils';

import useActivityCollection from '../../hooks/useActivityCollection';
import type { EventRecord, Identity } from '../../types';

type Props = {
  event: EventRecord;
};

/** Contextual banner explaining the viewer's current relationship to the event: draft mode
 *  (organizer, nobody invited yet), invited-but-not-joined, or share-delegated. */
const EventAlert = ({ event }: Props) => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Identity>();
  const { items: announces, isLoading } = useActivityCollection(event['apods:announces']);
  const { items: announcers } = useActivityCollection(event['apods:announcers']);
  const { items: attendees } = useActivityCollection(event['apods:attendees']);

  if (!identity?.id || isLoading) return null;

  let messageKey: string | undefined;

  if (event['dc:creator'] === identity.id) {
    if (announces.length === 0) messageKey = 'event.draft_mode';
  } else {
    const status = arrayOf(event['apods:hasStatus']);
    if (!attendees.includes(identity.id) && !status.includes('apods:Closed')) {
      messageKey = 'event.join_right';
    } else if (announcers.includes(identity.id)) {
      messageKey = 'event.share_right';
    }
  }

  if (!messageKey) return null;

  return <Alert type="info" showIcon message={t(messageKey)} style={{ marginBottom: 16 }} />;
};

export default EventAlert;
