import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity, useList } from '@refinedev/core';
import { Alert, Input, List } from 'antd';

import ContactItem from './ContactItem';
import GroupContactsItem from './GroupContactsItem';
import { formatUsername } from '../../utils/formatUsername';
import type { GroupRecord, Identity, InvitationState, ProfileRecord } from '../../types';

type Props = {
  invitations: Record<string, InvitationState>;
  organizerUri: string;
  isCreator: boolean;
  onChange: (invitations: Record<string, InvitationState>) => void;
};

const ContactsShareList = ({ invitations, organizerUri, isCreator, onChange }: Props) => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Identity>();
  const [search, setSearch] = useState('');

  const { result: profilesResult, query: profilesQuery } = useList<ProfileRecord>({
    resource: 'profile',
    pagination: { mode: 'off' },
    sorters: [{ field: 'vcard:given-name', order: 'asc' }]
  });
  const { result: groupsResult, query: groupsQuery } = useList<GroupRecord>({
    resource: 'group',
    pagination: { mode: 'off' },
    sorters: [{ field: 'vcard:label', order: 'asc' }]
  });

  const profiles = useMemo(
    () =>
      profilesResult.data
        .filter((profile: ProfileRecord) => profile.describes !== organizerUri && profile.describes !== identity?.id)
        .filter(
          (profile: ProfileRecord) =>
            (profile['vcard:given-name'] || '').toLowerCase().includes(search.toLowerCase()) ||
            formatUsername(profile.describes).toLowerCase().includes(search.toLowerCase())
        ),
    [profilesResult, search, organizerUri, identity]
  );

  const groups = useMemo(
    () =>
      groupsResult.data.filter((group: GroupRecord) => (group['vcard:label'] || '').toLowerCase().includes(search.toLowerCase())),
    [groupsResult, search]
  );

  const isLoading = profilesQuery.isLoading || groupsQuery.isLoading;

  return (
    <div>
      <Input.Search
        placeholder={t('actions.search')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />
      <List
        dataSource={[...groups.map(g => ({ type: 'group' as const, record: g })), ...profiles.map(p => ({ type: 'profile' as const, record: p }))]}
        loading={isLoading}
        locale={{ emptyText: ' ' }}
        renderItem={item =>
          item.type === 'group' ? (
            <GroupContactsItem key={item.record.id} group={item.record} invitations={invitations} isCreator={isCreator} onChange={onChange} />
          ) : (
            <ContactItem
              key={item.record.id}
              profile={item.record}
              invitation={invitations[item.record.describes]}
              isCreator={isCreator}
              onChange={onChange}
            />
          )
        }
      />
      {!isLoading && profiles.length === 0 && groups.length === 0 && (
        <Alert type="warning" showIcon message={t('share.no_contact')} />
      )}
    </div>
  );
};

export default ContactsShareList;
