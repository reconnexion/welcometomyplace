import { useTranslation } from 'react-i18next';
import { useOne, useParsed } from '@refinedev/core';
import { Button, Spin } from 'antd';
import { Link } from 'react-router';

import PageLayout from '../components/layout/PageLayout';
import MarkdownContent from '../components/common/MarkdownContent';
import type { FormatRecord } from '../types';

const FormatShowPage = () => {
  const { t } = useTranslation();
  const { id } = useParsed();
  const { result: format, query } = useOne<FormatRecord>({ resource: 'format', id });

  if (query.isLoading || !format) {
    return (
      <PageLayout>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ backgroundColor: '#fff', padding: '32px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h1 className="ap-font-display" style={{ textAlign: 'center', margin: '16px 0' }}>
            {format['rdfs:label']}
          </h1>
          {format.summary && (
            <p style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: 32 }}>{format.summary}</p>
          )}
          {format.image && (
            <div
              style={{
                backgroundImage: `url("${format.image}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                width: '100%',
                height: 300,
                borderRadius: 8
              }}
            />
          )}
          <div style={{ paddingTop: 32 }}>
            <h2 style={{ fontFamily: 'inherit' }}>{t('format.recipe')} 🪄</h2>
            <MarkdownContent>{format['apods:recipe']}</MarkdownContent>
          </div>
          <div style={{ width: '100%', textAlign: 'center', paddingBottom: 16 }}>
            <Link to="/events/create">
              <Button type="primary" className="ap-btn-pill">
                {t('format.propose_this')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default FormatShowPage;
