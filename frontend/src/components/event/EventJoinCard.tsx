import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'antd';
import { arrayOf } from '@activitypods/refine-providers/utils';

import JoinButton from './JoinButton';
import type { EventRecord } from '../../types';

type Props = {
  event: EventRecord;
  children: ReactNode;
};

const EventJoinCard = ({ event, children }: Props) => {
  const { t } = useTranslation();
  const status = arrayOf(event['apods:hasStatus']);
  const statusMessage = status.includes('apods:Closed')
    ? t('event.event_closed')
    : status.includes('apods:Finished')
      ? t('event.event_finished')
      : undefined;

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      style={{ overflow: 'hidden' }}
    >
      <div className="ap-gradient-surface" style={{ padding: 16 }}>
        <h3 className="ap-font-display" style={{ margin: 0, fontSize: 22, color: '#fff' }}>
          {event.name}
        </h3>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
      <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
        <JoinButton event={event} type="primary" block />
        {statusMessage && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#FFA500' }}>{statusMessage}</div>
        )}
      </div>
    </Card>
  );
};

export default EventJoinCard;
