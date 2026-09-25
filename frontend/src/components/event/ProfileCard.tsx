import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Avatar, Button, Card } from 'antd';
import { UserOutlined } from '@ant-design/icons';

import useNodeinfo from '../../hooks/useNodeinfo';
import useOwnProfile from '../../hooks/useOwnProfile';
import urlJoin from '../../utils/urlJoin';
import { formatUsername } from '../../utils/formatUsername';
import type { Identity } from '../../types';

/** Sidebar card on the events list page: the logged-in user's own avatar/name/handle, and a
 *  deep link out to the Pod provider's own frontend for profile editing (no in-app profile page).
 *  Links directly to the frontend's private-profile settings page (like UserMenu's
 *  network/apps/data/settings links) rather than through the generic `openApp` redirect — that
 *  redirect's `mode=edit` doesn't route to this specific page on the current frontend. */
const ProfileCard = () => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Identity>();
  const { data: profile } = useOwnProfile();
  const { data: nodeinfo } = useNodeinfo(identity?.id ? new URL(identity.id).host : undefined);

  if (!identity) return null;

  const frontendUrl = nodeinfo?.metadata?.frontend_url;

  return (
    <Card className="ap-card" styles={{ body: { padding: 0 } }} style={{ overflow: 'hidden', marginTop: 5 }}>
      <div className="ap-gradient-surface ap-gradient-flat" style={{ height: 85, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center' }}>
          <Avatar size={150} src={profile?.['vcard:photo']} icon={!profile?.['vcard:photo'] && <UserOutlined />} />
        </div>
      </div>
      <div style={{ padding: '80px 24px 20px', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 40, lineHeight: '58px' }}>{profile?.['vcard:given-name']}</h2>
        <div style={{ fontSize: 16 }}>{formatUsername(identity.id)}</div>
      </div>
      {frontendUrl && (
        <div style={{ padding: '0 24px 24px' }}>
          <a href={urlJoin(frontendUrl, 'settings/profiles/private')}>
            <Button type="primary" block>
              {t('nav.my_profile')}
            </Button>
          </a>
        </div>
      )}
    </Card>
  );
};

export default ProfileCard;
