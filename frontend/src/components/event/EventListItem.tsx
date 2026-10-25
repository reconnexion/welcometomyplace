import { Card, Grid } from 'antd';
import { Link } from 'react-router';

import EventCard from './EventCard';
import useCapabilityImage from '../../hooks/useCapabilityImage';
import type { Capability } from '../../utils/capability';
import type { EventRecord } from '../../types';

type Props = {
  event: EventRecord;
  /** For an event the user can only read through its public link */
  capability?: Capability;
  capabilityUri?: string;
};

const EventListItem = ({ event, capability, capabilityUri }: Props) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const image = useCapabilityImage(Array.isArray(event.image) ? event.image[0] : event.image, capability);
  const startDate = new Date(event.startTime);

  const imageBlockStyle = isMobile ? { width: '100%', minHeight: 145 } : { width: 180, minWidth: 180, minHeight: 145 };

  return (
    <Link
      to={`/events/${encodeURIComponent(event.id)}${capabilityUri ? `?cap=${encodeURIComponent(capabilityUri)}` : ''}`}
      style={{ color: 'inherit' }}
    >
      <Card
        styles={{ body: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', padding: 0 } }}
        className="ap-card"
        style={{ marginBottom: 20, overflow: 'hidden' }}
        hoverable
      >
        {image ? (
          <div
            style={{
              ...imageBlockStyle,
              backgroundImage: `url("${image}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        ) : (
          <div
            className="ap-gradient-surface ap-gradient-flat"
            style={{
              ...imageBlockStyle,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 12 }}>{startDate.toLocaleDateString(undefined, { weekday: 'long' })}</div>
            <div className="ap-font-display" style={{ fontSize: 50, lineHeight: 1.3, fontWeight: 700 }}>
              {startDate.getDate()}
            </div>
            <div style={{ fontSize: 12 }}>{startDate.toLocaleDateString(undefined, { month: 'long' })}</div>
          </div>
        )}
        <div style={{ padding: '10px 16px 16px', flex: 1, minWidth: 0 }}>
          <EventCard event={event} />
        </div>
      </Card>
    </Link>
  );
};

export default EventListItem;
