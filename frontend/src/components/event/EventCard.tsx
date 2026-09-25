import { useOne } from '@refinedev/core';
import { CalendarOutlined, StarOutlined, UserOutlined } from '@ant-design/icons';

import useActorProfile from '../../hooks/useActorProfile';
import { formatEventDateTime } from '../../utils/formatEventDate';
import type { EventRecord, FormatRecord } from '../../types';

type Props = {
  event: EventRecord;
};

const EventCard = ({ event }: Props) => {
  const { data: organizerProfile } = useActorProfile(event['dc:creator']);
  const { result: format } = useOne<FormatRecord>({
    resource: 'format',
    id: event['apods:hasFormat'],
    queryOptions: { enabled: !!event['apods:hasFormat'] }
  });

  return (
    <>
      <h2 className="ap-font-display" style={{ margin: 0, fontSize: 20, fontWeight: 500, lineHeight: 1.8, color: '#FFA500' }}>
        {event.name}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 8 }}>
        <span className="ap-event-meta">
          <CalendarOutlined />
          {formatEventDateTime(event.startTime)}
        </span>
        {organizerProfile?.['vcard:given-name'] && (
          <span className="ap-event-meta">
          <UserOutlined />
            {organizerProfile['vcard:given-name']}
          </span>
        )}
        {format?.['rdfs:label'] && (
          <span className="ap-event-meta">
          <StarOutlined />
            {format['rdfs:label']}
          </span>
        )}
      </div>
      <p
        style={{
          margin: '10px 0 0',
          fontSize: 14,
          lineHeight: '16px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {event.content}
      </p>
    </>
  );
};

export default EventCard;
