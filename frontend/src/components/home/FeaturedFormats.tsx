import { useTranslation } from 'react-i18next';
import { Button, Col, Row } from 'antd';
import { Link } from 'react-router';

import FormatExample from './FormatExample';

const FeaturedFormats = () => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '80px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 className="ap-heading-accent ap-font-display">{t('home.events_ideas')}</h2>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={14}>
            <FormatExample name={t('formats.open_table')} image="/images/table-ouverte.png" backgroundPosition="bottom" />
          </Col>
          <Col xs={24} sm={10}>
            <FormatExample name={t('formats.film_debate')} image="/images/cine-echanges.png" backgroundPosition="bottom" />
          </Col>
          <Col xs={24} sm={10}>
            <FormatExample name={t('formats.book_club')} image="/images/cercle-de-lecture.png" backgroundPosition="bottom" />
          </Col>
          <Col xs={24} sm={14}>
            <FormatExample name={t('formats.talking_circle')} image="/images/cercle-de-parole.png" />
          </Col>
        </Row>
        <div style={{ marginTop: 48, width: '100%', textAlign: 'center' }}>
          <Link to="/login?signup=true">
            <Button type="primary" className="ap-btn-pill" style={{ marginRight: 16 }}>
              {t('actions.signup')}
            </Button>
          </Link>
          <Link to="/login">
            <Button type="primary" className="ap-btn-pill">
              {t('actions.login')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FeaturedFormats;
