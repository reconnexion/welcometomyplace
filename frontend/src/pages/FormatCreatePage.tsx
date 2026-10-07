import { useTranslation } from 'react-i18next';
import { useForm } from '@refinedev/antd';
import { Button, Card, Form } from 'antd';

import PageLayout from '../components/layout/PageLayout';
import FormatForm from '../components/format/FormatForm';
import type { FormatRecord } from '../types';

const FormatCreatePage = () => {
  const { t } = useTranslation();
  const { formProps, saveButtonProps } = useForm<FormatRecord>({ resource: 'format', redirect: 'show' });

  return (
    <PageLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <h1 className="ap-font-display">{t('format.create')}</h1>
        <Card>
          <Form {...formProps} layout="vertical">
            <FormatForm />
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

export default FormatCreatePage;
