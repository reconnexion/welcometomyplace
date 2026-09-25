import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Avatar, Button, Dropdown, Space } from 'antd';
import { AppstoreOutlined, DatabaseOutlined, LogoutOutlined, SettingOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router';

import useNodeinfo from '../../hooks/useNodeinfo';
import urlJoin from '../../utils/urlJoin';
import { authProvider } from '../../providers';
import type { Identity } from '../../types';

const UserMenu = () => {
  const { t } = useTranslation();
  const { data: identity, isLoading } = useGetIdentity<Identity>();
  // The Pod provider's own frontend (network/apps/data/settings pages all live there, not in
  // this app) is discovered via the standard nodeinfo protocol against the WebID's own host.
  const { data: nodeinfo } = useNodeinfo(identity?.id ? new URL(identity.id).host : undefined);

  if (isLoading) return null;

  if (!identity?.id) {
    return (
      <Link to="/login">
        <Button type="primary">{t('actions.login')}</Button>
      </Link>
    );
  }

  const frontendUrl = nodeinfo?.metadata?.frontend_url;

  // Bypass useLogout()'s mutation: the package's authProvider.logout() hardcodes a redirect to
  // this app's own /login, and there's no way to override that from the caller. Calling
  // authProvider.logout() directly still clears the session correctly; the full-page navigation
  // that follows discards all React/Refine state on its own, so there's nothing left to clean up.
  const handleLogout = async () => {
    await authProvider.logout({});
    window.location.href = frontendUrl || '/login';
  };

  return (
    <Dropdown
      menu={{
        items: [
          ...(frontendUrl
            ? [
                {
                  key: 'network',
                  label: (
                    <a href={urlJoin(frontendUrl, 'network')} target="_blank" rel="noopener noreferrer">
                      {t('nav.network')}
                    </a>
                  ),
                  icon: <TeamOutlined />
                },
                {
                  key: 'apps',
                  label: (
                    <a href={urlJoin(frontendUrl, 'apps')} target="_blank" rel="noopener noreferrer">
                      {t('nav.apps')}
                    </a>
                  ),
                  icon: <AppstoreOutlined />
                },
                {
                  key: 'data',
                  label: (
                    <a href={urlJoin(frontendUrl, 'data')} target="_blank" rel="noopener noreferrer">
                      {t('nav.data')}
                    </a>
                  ),
                  icon: <DatabaseOutlined />
                },
                {
                  key: 'settings',
                  label: (
                    <a href={urlJoin(frontendUrl, 'settings')} target="_blank" rel="noopener noreferrer">
                      {t('nav.settings')}
                    </a>
                  ),
                  icon: <SettingOutlined />
                }
              ]
            : []),
          {
            key: 'logout',
            label: t('actions.logout'),
            icon: <LogoutOutlined />,
            onClick: () => handleLogout()
          }
        ]
      }}
      trigger={['click']}
    >
      <Space style={{ cursor: 'pointer', color: 'inherit' }}>
        <Avatar src={identity.avatar} icon={!identity.avatar && <UserOutlined />} />
        <span className="ap-usermenu-name">{identity.name}</span>
      </Space>
    </Dropdown>
  );
};

export default UserMenu;
