import { useTranslation } from 'react-i18next';
import { Grid, Layout } from 'antd';
import { HeartFilled, HomeFilled } from '@ant-design/icons';
import { Link } from 'react-router';
import { useGetIdentity } from '@refinedev/core';

import useScrollTrigger from '../../hooks/useScrollTrigger';
import UserMenu from './UserMenu';
import { APP_NAME } from '../../config/env';
import type { Identity } from '../../types';

export const APP_BAR_HEIGHT = 64;

const DONATION_URL = 'https://www.helloasso.com/associations/reconnexion/formulaires/1';

type Props = {
  /** Force the opaque gradient background, instead of transparent-until-scrolled (used on every
   *  page except the home page, which sits on top of the hero image). */
  opaque?: boolean;
};

const AppBar = ({ opaque }: Props) => {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const { data: identity } = useGetIdentity<Identity>();
  const trigger = useScrollTrigger(window.innerHeight - APP_BAR_HEIGHT);
  const isOpaque = opaque || trigger;
  const homeLink = identity?.id ? '/events' : '/';

  return (
    <Layout.Header
      className={isOpaque ? 'ap-gradient-surface' : undefined}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: APP_BAR_HEIGHT,
        lineHeight: `${APP_BAR_HEIGHT}px`,
        padding: '0 25px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: isOpaque ? undefined : 'transparent',
        boxShadow: 'none',
        transition: 'background-color 0.2s ease'
      }}
    >
      <Link to={homeLink} className="ap-appbar-title ap-font-display">
        <HomeFilled style={{ fontSize: 24 }} />
        {APP_NAME}
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {screens.md && (
          <a href={DONATION_URL} target="_blank" rel="noopener noreferrer" className="ap-appbar-link">
            <HeartFilled /> {t('nav.support')}
          </a>
        )}
        <UserMenu />
      </div>
    </Layout.Header>
  );
};

export default AppBar;
