import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Button } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';

import ShareDialog from './ShareDialog';
import useActivityCollection from '../../hooks/useActivityCollection';
import type { EventRecord, Identity } from '../../types';

type Props = {
  event: EventRecord;
};

/** Only rendered for the organizer, or someone the organizer delegated share rights to.
 *  @activitypods/react's ShareButton instead infers this from whether reading `apods:announces`
 *  succeeds — but that read turns out to succeed for every invitee regardless of share rights
 *  (confirmed live: a plain view-only invitee can read it fine), so that signal can't
 *  distinguish anything. Checking actual membership in `apods:announcers` is reliable instead:
 *  its *contents* are correct regardless of who's allowed to read it. Membership must be
 *  positively confirmed (`isSuccess`), not just "no error yet" — a query that never ran (e.g. no
 *  one has been granted share rights yet, so `apods:announcers` doesn't exist on the event at
 *  all) looks identical to "ran fine, found nothing", which is why the creator is always shown
 *  regardless of this collection's state. */
const ShareButton = ({ event }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: identity } = useGetIdentity<Identity>();
  const isCreator = event['dc:creator'] === identity?.id;
  const { items: announcers, isSuccess } = useActivityCollection(event['apods:announcers']);
  const isAnnouncer = isSuccess && announcers.includes(identity?.id ?? '');

  if (!isCreator && !isAnnouncer) return null;

  return (
    <>
      <Button type="text" className="ap-btn-text-action" icon={<ShareAltOutlined />} onClick={() => setOpen(true)}>
        {t('actions.share')}
      </Button>
      {open && <ShareDialog event={event} open={open} onClose={() => setOpen(false)} />}
    </>
  );
};

export default ShareButton;
