import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from '@refinedev/antd';
import { useNavigate } from 'react-router';
import { Button, Card, Form, Spin } from 'antd';

import PageLayout from '../components/layout/PageLayout';
import { APP_BAR_HEIGHT } from '../components/layout/AppBar';
import EventForm from '../components/event/EventForm';
import useWaitForPredicates from '../hooks/useWaitForPredicates';
import type { EventRecord } from '../types';

const EventCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const waitForPredicates = useWaitForPredicates();
  const [creating, setCreating] = useState(false);

  const { formProps, form, saveButtonProps } = useForm<EventRecord>({
    resource: 'event',
    redirect: false,
    onMutationSuccess: async data => {
      setCreating(true);
      // The backend computes these fields asynchronously (status tagging, attendees collection
      // creation) — wait for them to land before sending the user to the show page.
      const record = await waitForPredicates('event', data.data, ['apods:attendees', 'apods:hasStatus', 'dc:creator']);
      navigate(`/events/${encodeURIComponent(record.id as string)}`);
    }
  });

  if (creating) {
    return (
      <PageLayout>
        <div
          style={{
            minHeight: `calc(100vh - ${APP_BAR_HEIGHT}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}
        >
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>{t('event.event_creating')}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <h1 className="ap-font-display">{t('event.create')}</h1>
        <Card>
          <Form {...formProps} layout="vertical">
            <EventForm form={form} />
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" {...saveButtonProps}>
                {t('actions.save')}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </PageLayout>
  );
};

export default EventCreatePage;
