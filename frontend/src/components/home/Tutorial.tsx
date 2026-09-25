import { useTranslation } from 'react-i18next';
import { Col, Row } from 'antd';
import { MailOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons';

const steps = [
  { key: 'step_1', Icon: ThunderboltOutlined },
  { key: 'step_2', Icon: MailOutlined },
  { key: 'step_3', Icon: TeamOutlined }
] as const;

const Tutorial = () => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '96px 16px', backgroundColor: '#fff' }}>
      <h2 className="ap-heading-accent ap-font-display">{t('home.how_does_it_work')}</h2>
      <Row gutter={[64, 48]} style={{ maxWidth: 1100, margin: '0 auto' }}>
        {steps.map(({ key, Icon }) => (
          <Col xs={24} sm={8} key={key}>
            <div style={{ textAlign: 'center' }}>
              <Icon style={{ fontSize: 60, color: '#FFA500', marginBottom: 16 }} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 20, color: '#000' }}>{t(`home.${key}.description`)}</p>
            <span
              className="ap-font-display"
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: 24,
                color: '#FFA500',
                textTransform: 'uppercase',
                marginTop: 24
              }}
            >
              {t(`home.${key}.hashtag`)}
            </span>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Tutorial;
