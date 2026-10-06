import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { App, Button, type ButtonProps } from 'antd';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';

import useOutbox from '../../hooks/useOutbox';
import useActivityCollection from '../../hooks/useActivityCollection';
import { authProvider } from '../../providers';
import { arrayOf } from '@activitypods/refine-providers/utils';
import type { EventRecord, Identity } from '../../types';

type Props = ButtonProps & {
  event: EventRecord;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const InterestedButton = ({ event, ...buttonProps }: Props) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { data: identity } = useGetIdentity<Identity>();
  const outbox = useOutbox();
  const { items: interestedUris, isLoading: interestedLoading, refetch } = useActivityCollection(event.likes);
  const { items: announcesUris, isLoading: announcesLoading } = useActivityCollection(event['apods:announces']);
  const { items: attendees } = useActivityCollection(event['apods:attendees']);
  const [pending, setPending] = useState(false);
  const [isInterested, setIsInterested] = useState(false);

  const session = authProvider.getSession();

  useEffect(() => {
    setIsInterested(interestedUris.includes(identity?.id ?? ''));
  }, [interestedUris, identity]);

  const isOrganizer = event['dc:creator'] === identity?.id;
  const isInvited = announcesUris.includes(identity?.id ?? '');
  const hasJoined = attendees.includes(identity?.id ?? '');
  const status = arrayOf(event['apods:hasStatus']);
  const isFinished = status.includes('apods:Finished');

  const waitForLikeUpdate = async (expectInterested: boolean) => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await delay(1000);
      const { data } = await refetch();
      if ((data ?? []).includes(identity?.id ?? '') === expectInterested) return;
    }
  };

  const post = async (type: 'Like' | 'Undo') => {
    setPending(true);
    try {
      if (type === 'Like') {
        await outbox.post({
          type: 'Like',
          actor: outbox.owner,
          object: event.id,
          to: event['dc:creator']
        });
        message.success(t('event.interested_success'));
        setIsInterested(true);
        waitForLikeUpdate(true);
      } else {
        await outbox.post({
          type: 'Undo',
          actor: outbox.owner,
          object: {
            type: 'Like',
            actor: outbox.owner,
            object: event.id
          },
          to: event['dc:creator']
        });
        message.success(t('event.not_interested_success'));
        setIsInterested(false);
        waitForLikeUpdate(false);
      }
    } catch (e: any) {
      message.error(e.message);
    }
    setPending(false);
  };

  // For the organizer: don't show anything (interested users are shown in the event page section)
  if (isOrganizer) {
    return null;
  }

  // For regular users: show button, no count. Only show if invited, not joined, and not finished
  if (!session || !isInvited || hasJoined || isFinished || interestedLoading || announcesLoading) {
    return null;
  }

  const buttonLabel = isInterested ? t('event.not_interested') : t('event.interested');

  return (
    <Button
      type="text"
      className="ap-btn-text-action"
      icon={isInterested ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
      onClick={() => post(isInterested ? 'Undo' : 'Like')}
      disabled={pending}
      {...buttonProps}
    >
      {buttonLabel}
    </Button>
  );
};

export default InterestedButton;
