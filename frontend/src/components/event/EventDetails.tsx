import { useTranslation } from 'react-i18next';
import { CalendarOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';

import IconsList from '../common/IconsList';
import useActorProfile from '../../hooks/useActorProfile';
import formatDuration from '../../utils/formatDuration';
import { formatEventDateTime } from '../../utils/formatEventDate';
import type { EventRecord } from '../../types';

type Props = {
  event: EventRecord;
  orientation?: 'horizontal' | 'vertical';
};

const EventDetails = ({ event, orientation }: Props) => {
  const { t } = useTranslation();
  const { data: organizerProfile } = useActorProfile(event['dc:creator']);

  return (
    <IconsList
      orientation={orientation}
      items={[
        {
          icon: <UserOutlined />,
          label: t('event.organizer'),
          value: organizerProfile?.['vcard:given-name']
        },
        {
          icon: <CalendarOutlined />,
          label: t('event.date'),
          value: formatEventDateTime(event.startTime)
        },
        {
          icon: <ClockCircleOutlined />,
          label: t('event.duration'),
          value: formatDuration(event.startTime, event.endTime, t)
        }
      ]}
    />
  );
};

export default EventDetails;
