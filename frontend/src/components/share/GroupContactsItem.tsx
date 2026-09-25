import { useTranslation } from 'react-i18next';
import { Avatar, List, Switch } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { arrayOf } from '@activitypods/refine-providers/utils';

import type { GroupRecord, InvitationState } from '../../types';

type Props = {
  group: GroupRecord;
  invitations: Record<string, InvitationState>;
  isCreator: boolean;
  onChange: (invitations: Record<string, InvitationState>) => void;
};

/** A group's row toggles view/share for every member at once — each Switch reflects "checked"
 *  only when every (non-readonly) member currently shares that state. */
const GroupContactsItem = ({ group, invitations, isCreator, onChange }: Props) => {
  const { t } = useTranslation();
  const memberIds = arrayOf(group['vcard:hasMember']);

  const viewChecked = memberIds.every(id => invitations[id]?.canView || invitations[id]?.canShare);
  const shareChecked = memberIds.every(id => invitations[id]?.canShare);
  const viewReadonly = memberIds.every(id => invitations[id]?.viewReadonly || invitations[id]?.shareReadonly);
  const shareReadonly = memberIds.every(id => invitations[id]?.shareReadonly);

  const switchView = () => {
    const newViewState = !viewChecked;
    const changes: Record<string, InvitationState> = {};
    memberIds.forEach(id => {
      if (invitations[id]?.viewReadonly) return;
      changes[id] = {
        ...(invitations[id] ?? { canView: false, canShare: false, viewReadonly: false, shareReadonly: !isCreator }),
        canView: newViewState,
        canShare: newViewState && shareChecked
      };
    });
    onChange(changes);
  };

  const switchShare = () => {
    const newShareState = !shareChecked;
    const changes: Record<string, InvitationState> = {};
    memberIds.forEach(id => {
      if (invitations[id]?.shareReadonly) return;
      changes[id] = {
        ...(invitations[id] ?? { canView: false, canShare: false, viewReadonly: false, shareReadonly: !isCreator }),
        canShare: newShareState,
        canView: newShareState || viewChecked
      };
    });
    onChange(changes);
  };

  return (
    <List.Item style={{ paddingLeft: 0, paddingRight: 0, gap: 12, flexWrap: 'wrap' }}>
      <List.Item.Meta
        avatar={<Avatar src={group['vcard:photo']} icon={!group['vcard:photo'] && <TeamOutlined />} />}
        title={group['vcard:label']}
      />
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{t('share.view')}</div>
          <Switch checked={viewChecked} disabled={viewReadonly} onChange={switchView} />
        </div>
        {isCreator && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{t('share.share')}</div>
            <Switch checked={shareChecked} disabled={shareReadonly} onChange={switchShare} />
          </div>
        )}
      </div>
    </List.Item>
  );
};

export default GroupContactsItem;
