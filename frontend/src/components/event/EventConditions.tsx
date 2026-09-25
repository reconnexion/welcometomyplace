import { useTranslation } from 'react-i18next';

import { formatFullDateTime } from '../../utils/formatEventDate';
import type { EventRecord } from '../../types';

type Props = {
  event: EventRecord;
};

const EventConditions = ({ event }: Props) => {
  const { t } = useTranslation();
  const conditions = event['apods:otherConditions'];
  const hasAny = conditions || event['apods:closingTime'] || event['apods:maxAttendees'];

  return (
    <ul style={{ margin: 0, paddingLeft: 20 }}>
      {conditions?.split('\n').map((condition, i) => <li key={i}>{condition}</li>)}
      {event['apods:closingTime'] && (
        <li>
          <strong>{t('event.closing_time')}:</strong> {formatFullDateTime(event['apods:closingTime'])}
        </li>
      )}
      {event['apods:maxAttendees'] && (
        <li>
          <strong>{t('event.max_attendees')}:</strong> {event['apods:maxAttendees']}
        </li>
      )}
      {!hasAny && <li>{t('event.no_condition')}</li>}
    </ul>
  );
};

export default EventConditions;
