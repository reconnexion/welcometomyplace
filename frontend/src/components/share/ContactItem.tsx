import { useTranslation } from 'react-i18next';
import { Avatar, List, Switch } from 'antd';
import { UserOutlined } from '@ant-design/icons';

import { formatUsername } from '../../utils/formatUsername';
import type { InvitationState, ProfileRecord } from '../../types';

type Props = {
  profile: ProfileRecord;
  invitation?: InvitationState;
  isCreator: boolean;
  onChange: (invitations: Record<string, InvitationState>) => void;
};

const ContactItem = ({ profile, invitation, isCreator, onChange }: Props) => {
  const { t } = useTranslation();

  const state: InvitationState = invitation ?? {
    canView: false,
    canShare: false,
    viewReadonly: false,
    shareReadonly: !isCreator
  };

  const changeCanView = () => {
    const newViewState = !state.canView;
    onChange({
      [profile.describes]: { ...state, canView: newViewState, canShare: newViewState && state.canShare }
    });
  };

  const changeCanShare = () => {
    const newShareState = !state.canShare;
    onChange({
      [profile.describes]: { ...state, canShare: newShareState, canView: newShareState || state.canView }
    });
  };

  return (
    <List.Item style={{ paddingLeft: 0, paddingRight: 0, gap: 12, flexWrap: 'wrap' }}>
      <List.Item.Meta
        avatar={<Avatar src={profile['vcard:photo']} icon={!profile['vcard:photo'] && <UserOutlined />} />}
        title={profile['vcard:given-name']}
        description={formatUsername(profile.describes)}
      />
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{t('share.view')}</div>
          <Switch checked={state.canView || state.canShare} disabled={state.viewReadonly} onChange={changeCanView} />
        </div>
        {isCreator && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{t('share.share')}</div>
            <Switch checked={state.canShare} disabled={state.shareReadonly} onChange={changeCanShare} />
          </div>
        )}
      </div>
    </List.Item>
  );
};

export default ContactItem;
