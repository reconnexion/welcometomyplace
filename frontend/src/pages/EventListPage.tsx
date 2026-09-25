import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useList } from '@refinedev/core';
import { Alert, Button, Col, Grid, Row, Spin, Tabs } from 'antd';
import { HomeFilled } from '@ant-design/icons';
import { Link } from 'react-router';

import PageLayout from '../components/layout/PageLayout';
import EventListItem from '../components/event/EventListItem';
import ProfileCard from '../components/event/ProfileCard';
import type { EventRecord } from '../types';

const EventListPage = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'coming' | 'finished'>('coming');
  const screens = Grid.useBreakpoint();

  const { result, query } = useList<EventRecord>({
    resource: 'event',
    // `apods:hasStatus` combines two independent axes (Coming/Finished and Open/Closed, e.g.
    // `[apods:Coming, apods:Open]`) — the tabs only care about the Coming/Finished one. The
    // backend returns this compacted to CURIE form (`apods:Coming`), not the full IRI the old
    // app's (server-side, IRI-aware SPARQL) filter used — this data provider compares plain
    // strings client-side, so the filter value has to match the actual returned representation.
    filters: [
      {
        field: 'apods:hasStatus',
        operator: 'eq',
        value: tab === 'coming' ? 'apods:Coming' : 'apods:Finished'
      }
    ],
    sorters: [{ field: 'startTime', order: tab === 'coming' ? 'asc' : 'desc' }],
    pagination: { mode: 'off' }
  });

  return (
    <PageLayout>
      <div style={{ backgroundColor: '#fff', paddingTop: 32, paddingBottom: 32 }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
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
              result.data.map((event: EventRecord) => <EventListItem key={event.id} event={event} />)
            )}
          </Col>
          <Col xs={0} md={8} lg={7}>
            <ProfileCard />
          </Col>
        </Row>
      </div>
    </PageLayout>
  );
};

export default EventListPage;
