import { useTranslation } from 'react-i18next';
import { useOne, useParsed, useGetIdentity } from '@refinedev/core';
import { Navigate, useLocation } from 'react-router';
import { Col, Grid, Row, Space, Spin } from 'antd';

import PageLayout from '../components/layout/PageLayout';
import { APP_BAR_HEIGHT } from '../components/layout/AppBar';
import EventDetails from '../components/event/EventDetails';
import EventAlert from '../components/event/EventAlert';
import EventConditions from '../components/event/EventConditions';
import EventJoinCard from '../components/event/EventJoinCard';
import ContactField from '../components/event/ContactField';
import AttendeeAvatar from '../components/event/AttendeeAvatar';
import HostLocationMap from '../components/event/HostLocationMap';
import MarkdownContent from '../components/common/MarkdownContent';
import BodyLabel from '../components/common/BodyLabel';
import EditButton from '../components/common/EditButton';
import ShareButton from '../components/share/ShareButton';
import CloneEventButton from '../components/event/CloneEventButton';
import JoinButton from '../components/event/JoinButton';
import InterestedButton from '../components/event/InterestedButton';
import useActivityCollection from '../hooks/useActivityCollection';
import useCapability from '../hooks/useCapability';
import useCapabilityImage from '../hooks/useCapabilityImage';
import { authProvider } from '../providers';
import type { Capability } from '../utils/capability';
import type { EventRecord, FormatRecord } from '../types';

const { useBreakpoint } = Grid;

const Loading = () => (
  <PageLayout>
    <div style={{ padding: 48, textAlign: 'center' }}>
      <Spin size="large" />
    </div>
  </PageLayout>
);

/**
 * This route is public so that public event links work for people without an account. The page
 * below is the same one members see; the only gate is here — a visitor with neither a session nor
 * a credential to read the event with is sent to log in, and one arriving with `?cap=` waits for
 * that credential to be loaded before any Pod read is attempted.
 */
const EventShowPage = () => {
  const { capability, capabilityUri, ready } = useCapability();
  const location = useLocation();
  const session = authProvider.getSession();

  if (!session && !capabilityUri) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (!ready) return <Loading />;

  return <EventShowContent capability={capability} />;
};

const EventShowContent = ({ capability }: { capability?: Capability }) => {
  const { t } = useTranslation();
  const { id } = useParsed();
  const screens = useBreakpoint();
  const isMobile = !screens.sm;
  const { data: identity } = useGetIdentity();

  const { result: event, query } = useOne<EventRecord>({ resource: 'event', id });
  const { result: format } = useOne<FormatRecord>({
    resource: 'format',
    id: event?.['apods:hasFormat'],
    queryOptions: { enabled: !!event?.['apods:hasFormat'] }
  });
  const { result: formatParent } = useOne<FormatRecord>({
    resource: 'format',
    id: format?.['skos:broader'],
    queryOptions: { enabled: !!format?.['skos:broader'] }
  });
  const { items: attendeeUris } = useActivityCollection(event?.['apods:attendees']);
  const { items: interestedUris } = useActivityCollection(event?.likes);

  const image = useCapabilityImage(
    event && (Array.isArray(event.image) ? event.image[0] : event.image),
    capability
  );

  if (query.isLoading || !event) return <Loading />;

  return (
    <PageLayout>
      <div style={{ backgroundColor: '#fff', paddingTop: 24, paddingBottom: 8 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <Row justify="space-between" align="top" gutter={[16, 16]}>
            <Col xs={24} sm={18}>
              {format && (
                <div style={{ fontSize: 13, marginBottom: 4, textTransform: 'uppercase', color: 'rgba(0,0,0,0.65)' }}>
                  {formatParent?.['rdfs:label']}&nbsp;&nbsp;&gt;&nbsp;&nbsp;
                  {format['rdfs:label']}
                </div>
              )}
              <h1 className="ap-font-display" style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.15 }}>
                {event.name}
              </h1>
            </Col>
            <Col xs={24} sm={6}>
              <Space
                style={{ width: '100%', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}
              >
                <ShareButton event={event} />
                <CloneEventButton event={event} />
                <EditButton creatorUri={event['dc:creator']} to={`/events/${encodeURIComponent(event.id)}/edit`} />
              </Space>
            </Col>
          </Row>
          <div style={{ padding: '16px 0' }}>
            <EventDetails event={event} orientation={isMobile ? 'vertical' : 'horizontal'} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }}>
        <Row gutter={24}>
          <Col xs={24} md={16} lg={17}>
            <EventAlert event={event} />

            {image && (
              <img
                src={image}
                alt={event.name}
                style={{ display: 'block', width: '100%', height: 225, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
              />
            )}

            <BodyLabel>{t('event.content')}</BodyLabel>
            <MarkdownContent>{event.content}</MarkdownContent>

            <BodyLabel>{t('event.conditions')}</BodyLabel>
            <EventConditions event={event} />

            {attendeeUris.length > 0 && (
              <>
                <BodyLabel>{t('event.attendees')}</BodyLabel>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  {attendeeUris.map(uri => (
                    <Col key={uri} xs={8} sm={4}>
                      <AttendeeAvatar actorUri={uri} />
                    </Col>
                  ))}
                </Row>
              </>
            )}

            {event['dc:creator'] === identity?.id && interestedUris.length > 0 && (
              <>
                <BodyLabel>{t('event.interested')}</BodyLabel>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  {interestedUris.map(uri => (
                    <Col key={uri} xs={8} sm={4}>
                      <AttendeeAvatar actorUri={uri} />
                    </Col>
                  ))}
                </Row>
              </>
            )}

            {event.location && (
              <>
                <BodyLabel>{t('event.location_section')}</BodyLabel>
                <HostLocationMap locationUri={event.location} />
              </>
            )}

            <div style={{ marginTop: 40 }}>
              <ContactField event={event} />
            </div>
          </Col>

          {!isMobile && (
            <Col md={8} lg={7}>
              <div style={{ position: 'sticky', top: APP_BAR_HEIGHT + 24 }}>
                <EventJoinCard event={event}>
                  <EventDetails event={event} orientation="vertical" />
                </EventJoinCard>
              </div>
            </Col>
          )}
        </Row>
      </div>

      {isMobile && (
        <div
          className="ap-gradient-surface"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '8px 16px',
            zIndex: 100,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <JoinButton event={event} type="primary" block />
        </div>
      )}
    </PageLayout>
  );
};

export default EventShowPage;
