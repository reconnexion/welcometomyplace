import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useList } from '@refinedev/core';
import { Alert, Button, Col, Grid, Row, Spin, Tabs } from 'antd';
import { HomeFilled } from '@ant-design/icons';
import { Link } from 'react-router';

import EventListItem from '../components/event/EventListItem';
import ProfileCard from '../components/event/ProfileCard';
import useLinkedEvents, { type LinkedEvent } from '../hooks/useLinkedEvents';
import type { EventRecord } from '../types';
import { isEventFinished } from '../utils/eventStatus';

type ListItem = Pick<LinkedEvent, 'event'> & Partial<LinkedEvent>;

const EventListPage = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'coming' | 'finished'>('coming');
  const screens = Grid.useBreakpoint();

  const { result, query } = useList<EventRecord>({
    resource: 'event',
    // The coming/finished split is based on `endTime` rather than on `apods:hasStatus`: the
    // status is switched by a backend timer, and copies of an event held by invitees (or events
    // whose timer was lost) may still say `apods:Coming` long after the event ended.
    pagination: { mode: 'off' }
  });

  const ownEventIds = useMemo(
    () => (query.isSuccess ? result.data.map(event => event.id) : undefined),
    [query.isSuccess, result.data]
  );
  const linkedEvents = useLinkedEvents(ownEventIds);

  const items = useMemo(() => {
    const all: ListItem[] = [...result.data.map(event => ({ event })), ...linkedEvents];
    const filtered = all.filter(({ event }) => isEventFinished(event) === (tab === 'finished'));
    const time = ({ event }: ListItem) => new Date(event.startTime).getTime();
    return filtered.sort((a, b) => (tab === 'coming' ? time(a) - time(b) : time(b) - time(a)));
  }, [result.data, linkedEvents, tab]);

  return (
    <>
      <div style={{ backgroundColor: '#fff', paddingTop: 32, paddingBottom: 32 }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            // On one line, also on mobile: the title shrinks (see .ap-page-title) and the button is shortened
            alignItems: 'center',
            gap: 12
          }}
        >
          <h1 className="ap-page-title">{t('event.my_events')}</h1>
          <Link to="/events/create">
            <Button type="primary">
              {screens.sm ? t('event.create') : t('event.create_short')}
            </Button>
          </Link>
        </div>
      </div>
      <div style={{ backgroundColor: '#e0e0e0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <Tabs
            activeKey={tab}
            onChange={key => setTab(key as 'coming' | 'finished')}
            centered={false}
            className="ap-tabs-uppercase"
            items={[
              { key: 'coming', label: t('event.tab_coming') },
              { key: 'finished', label: t('event.tab_finished') }
            ]}
          />
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <Row gutter={24}>
          <Col xs={24} md={16} lg={17}>
            <Alert
              icon={<HomeFilled />}
              showIcon
              type="warning"
              className="ap-alert-solid"
              style={{ marginBottom: 21 }}
              message={
                <>
                  {t('event.mission')}. {t('event.backed_by')}{' '}
                  <a href="https://reconnexion.coop" target="_blank" rel="noopener noreferrer">
                    Reconnexion
                  </a>
                </>
              }
            />
            {query.isLoading ? (
              <Spin />
            ) : (
              items.map(({ event, capability, capabilityUri }) => (
                <EventListItem key={event.id} event={event} capability={capability} capabilityUri={capabilityUri} />
              ))
            )}
          </Col>
          <Col xs={0} md={8} lg={7}>
            <ProfileCard />
          </Col>
        </Row>
      </div>
    </>
  );
};

export default EventListPage;
