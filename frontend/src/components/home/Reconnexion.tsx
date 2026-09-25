import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';

const RECONNEXION_URL = 'https://reconnexion.coop';

/** "Powered by" footer block, crediting the Reconnexion coop. */
const Reconnexion = () => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '64px 16px', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <Typography.Paragraph style={{ fontSize: 'clamp(18px, 2vw, 20px)', color: '#000', marginBottom: 16 }}>
          {t('home.app_supported_by')}
        </Typography.Paragraph>
        <a href={RECONNEXION_URL} target="_blank" rel="noreferrer">
          <img src="/images/reconnexion.png" alt="Reconnexion logo" style={{ maxWidth: 500, width: '100%' }} />
        </a>
        <Typography.Paragraph
          style={{ fontSize: 'clamp(18px, 2vw, 20px)', color: '#000', marginTop: 8, fontStyle: 'italic', maxWidth: 500, marginInline: 'auto' }}
        >
          {t('home.reconnexion_tagline')}
        </Typography.Paragraph>
        <Typography.Paragraph style={{ fontSize: 'clamp(18px, 2vw, 20px)', marginTop: 16 }}>
          <a href={RECONNEXION_URL} target="_blank" rel="noreferrer">
            reconnexion.coop
          </a>
        </Typography.Paragraph>
      </div>
    </div>
  );
};

export default Reconnexion;
