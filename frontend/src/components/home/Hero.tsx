import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { Link } from 'react-router';

const Hero = () => {
  const { t } = useTranslation();

  return (
    <div
      className="ap-hero"
      style={{
        backgroundImage: 'url("/images/background.png")',
        backgroundPosition: 'center bottom',
        backgroundSize: 'cover',
        width: '100%',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 'clamp(100px, 15vh, 150px)',
          width: '100%',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <h1 className="ap-hero-title">{t('home.title')}</h1>
        <p className="ap-hero-subtitle">{t('home.subtitle')}</p>
      </div>
      <div style={{ position: 'absolute', bottom: 64, width: '100%', textAlign: 'center' }}>
        <Link to="/login?signup=true">
          <Button className="ap-btn-pill ap-btn-pill-white" style={{ marginRight: 16 }}>
            {t('actions.signup')}
          </Button>
        </Link>
        <Link to="/login">
          <Button className="ap-btn-pill ap-btn-pill-white">{t('actions.login')}</Button>
        </Link>
      </div>
    </div>
  );
};

export default Hero;
