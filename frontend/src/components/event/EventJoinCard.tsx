import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'antd';

import JoinButton from './JoinButton';
import InterestedButton from './InterestedButton';
import type { EventRecord } from '../../types';
import { isEventClosed, isEventFinished } from '../../utils/eventStatus';

type Props = {
  event: EventRecord;
  children: ReactNode;
};

const EventJoinCard = ({ event, children }: Props) => {
  const { t } = useTranslation();
  const statusMessage = isEventFinished(event)
    ? t('event.event_finished')
    : isEventClosed(event)
      ? t('event.event_closed')
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
        <InterestedButton event={event} style={{ marginTop: 8 }} block />
        {statusMessage && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#FFA500' }}>{statusMessage}</div>
        )}
      </div>
    </Card>
  );
};

export default EventJoinCard;
