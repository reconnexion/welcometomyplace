import { useTranslation } from 'react-i18next';
import { useForm } from '@refinedev/antd';
import { Button, Card, Form, Spin } from 'antd';

import PageLayout from '../components/layout/PageLayout';
import EventForm from '../components/event/EventForm';
import type { EventRecord } from '../types';

const EventEditPage = () => {
  const { t } = useTranslation();
  const { formProps, form, saveButtonProps, formLoading } = useForm<EventRecord>({
    resource: 'event',
    redirect: 'show'
  });

  return (
    <PageLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <h1 className="ap-font-display">{formProps.initialValues?.name}</h1>
        <Card>
          {formLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Spin size="large" />
            </div>
          ) : (
            <Form {...formProps} layout="vertical">
              <EventForm form={form} />
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" {...saveButtonProps}>
                  {t('actions.save')}
                </Button>
              </Form.Item>
            </Form>
          )}
        </Card>
      </div>
    </PageLayout>
  );
};

export default EventEditPage;
