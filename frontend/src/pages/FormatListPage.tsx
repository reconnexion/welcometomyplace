import { useTranslation } from 'react-i18next';
import { useList } from '@refinedev/core';
import { Col, Row, Spin } from 'antd';

import PageLayout from '../components/layout/PageLayout';
import FormatCard from '../components/format/FormatCard';
import type { FormatRecord } from '../types';

const FormatListPage = () => {
  const { t } = useTranslation();
  const { result, query } = useList<FormatRecord>({
    resource: 'format',
    pagination: { mode: 'off' },
    sorters: [{ field: 'rdfs:label', order: 'asc' }]
  });

  return (
    <PageLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <h1 className="ap-font-display">{t('format.all_formats')}</h1>
        {query.isLoading ? (
          <Spin />
        ) : (
          <Row gutter={[24, 24]}>
            {result.data.map((format: FormatRecord) => (
              <Col xs={24} sm={12} md={8} key={format.id}>
                <FormatCard format={format} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </PageLayout>
  );
};

export default FormatListPage;
