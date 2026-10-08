import { useEffect, useMemo, useState, type UIEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity, useInfiniteList, useList } from '@refinedev/core';
import { Alert, Input, List, Spin } from 'antd';

import ContactItem from './ContactItem';
import GroupContactsItem from './GroupContactsItem';
import type { GroupRecord, Identity, InvitationState, ProfileRecord } from '../../types';

type Props = {
  invitations: Record<string, InvitationState>;
  organizerUri: string;
  isCreator: boolean;
  onChange: (invitations: Record<string, InvitationState>) => void;
};

/** Contacts are searched and paged by the Pod, and loaded while scrolling. Groups are few, so they
 *  are all fetched and filtered in memory. */
const ContactsShareList = ({ invitations, organizerUri, isCreator, onChange }: Props) => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Identity>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Don't query the Pod on every keystroke
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { result: profilesResult, query: profilesQuery } = useInfiniteList<ProfileRecord>({
    resource: 'profile',
    pagination: { pageSize: 20, mode: 'server' },
    sorters: [{ field: 'vcard:given-name', order: 'asc' }],
    filters: debouncedSearch ? [{ field: 'vcard:given-name', operator: 'contains', value: debouncedSearch }] : []
  });
  const { fetchNextPage, isFetchingNextPage } = profilesQuery;
  const { result: groupsResult, query: groupsQuery } = useList<GroupRecord>({
    resource: 'group',
    pagination: { mode: 'off' },
    sorters: [{ field: 'vcard:label', order: 'asc' }]
  });

  const profiles = useMemo(
    () =>
      (profilesResult.data?.pages ?? [])
        .flatMap(page => page.data)
        .filter((profile: ProfileRecord) => profile.describes !== organizerUri && profile.describes !== identity?.id),
    [profilesResult.data, organizerUri, identity]
  );

  const groups = useMemo(
    () =>
      groupsResult.data.filter((group: GroupRecord) =>
        (group['vcard:label'] || '').toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [groupsResult, debouncedSearch]
  );

  const isLoading = profilesQuery.isLoading || groupsQuery.isLoading;

  // Load the next page of contacts when the list is scrolled near its end
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 100 && profilesResult.hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div>
      <Input.Search
        placeholder={t('actions.search')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />
      {/* Only the list scrolls, so the search field and the dialog's buttons stay in view
          even with hundreds of contacts. */}
      <div style={{ maxHeight: 'min(400px, 50vh)', overflowY: 'auto' }} onScroll={onScroll}>
        <List
          dataSource={[
            ...groups.map(g => ({ type: 'group' as const, record: g })),
            ...profiles.map(p => ({ type: 'profile' as const, record: p }))
          ]}
          loading={isLoading}
          locale={{ emptyText: ' ' }}
          renderItem={item =>
            item.type === 'group' ? (
              <GroupContactsItem
                key={item.record.id}
                group={item.record}
                invitations={invitations}
                isCreator={isCreator}
                onChange={onChange}
              />
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
        {isFetchingNextPage && (
          <div style={{ textAlign: 'center', padding: 8 }}>
            <Spin size="small" />
          </div>
        )}
      </div>
      {!isLoading && profiles.length === 0 && groups.length === 0 && (
        <Alert
          type="warning"
          showIcon
          message={debouncedSearch ? t('share.no_match', { search: debouncedSearch }) : t('share.no_contact')}
        />
      )}
    </div>
  );
};

export default ContactsShareList;
