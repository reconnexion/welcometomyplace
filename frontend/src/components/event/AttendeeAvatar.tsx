import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { UserOutlined } from '@ant-design/icons';

import useActorProfile from '../../hooks/useActorProfile';
import useNodeinfo from '../../hooks/useNodeinfo';
import urlJoin from '../../utils/urlJoin';
import { formatUsername } from '../../utils/formatUsername';
import type { Identity } from '../../types';

type Props = {
  actorUri: string;
};

/** Matches the old app's `AvatarWithLabelField`: a full-width circular avatar (scales with the
 *  grid column, so it's larger on wider columns) with a pill-shaped name label overlapping its
 *  bottom edge, instead of a small fixed-size avatar with plain text underneath. Links directly
 *  to this attendee's profile on the Pod provider's network page (`/network/@user@host`, the
 *  same webfinger-style handle `NetworkPage` itself links with) rather than through the generic
 *  `openApp` redirect, which turned out to be unreliable (it resolves `type=as:Profile` against
 *  the wrong resource for a bare WebID). */
const AttendeeAvatar = ({ actorUri }: Props) => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Identity>();
  const { data: profile } = useActorProfile(actorUri);
  const { data: nodeinfo } = useNodeinfo(identity?.id ? new URL(identity.id).host : undefined);
  const name = profile?.['vcard:given-name'] || t('event.unknown_user');
  const photo = profile?.['vcard:photo'];
  const frontendUrl = nodeinfo?.metadata?.frontend_url;

  return (
    <a
      href={frontendUrl ? urlJoin(frontendUrl, `network/${formatUsername(actorUri)}`) : undefined}
      style={{ display: 'block', position: 'relative', color: 'inherit', marginBottom: 14 }}
    >
      <div style={{ width: '100%', paddingBottom: '100%', position: 'relative' }}>
        {photo ? (
          <img
            src={photo}
            alt={name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* `fontSize` as a percentage resolves against the inherited font-size, not this
                container's actual (fluid) rendered size, so a fixed value is used instead. */}
            <UserOutlined style={{ fontSize: 48, color: 'rgba(0, 0, 0, 0.35)' }} />
          </div>
        )}
      </div>
      <span
        style={{
          position: 'absolute',
          bottom: -10,
          left: 4,
          right: 4,
          textAlign: 'center',
          backgroundColor: '#FFA500',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          padding: '3px 8px',
          borderRadius: 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {name}
      </span>
    </a>
  );
};

export default AttendeeAvatar;
