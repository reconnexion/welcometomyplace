import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    pagination: { pageSize: 50, mode: 'server' },
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

  // Load the next page before the end of the list is reached: as soon as less than one visible
  // height of contacts is left below, so that scrolling doesn't stop on a spinner
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreIfNeeded = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !profilesResult.hasNextPage || isFetchingNextPage) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight) fetchNextPage();
  }, [profilesResult.hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Also check when a page lands, in case the list was already scrolled that far while it loaded
  useEffect(loadMoreIfNeeded, [loadMoreIfNeeded, profilesResult.data]);

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
      <div
        ref={scrollRef}
        style={{ maxHeight: 'min(400px, 50vh)', overflowY: 'auto' }}
        onScroll={loadMoreIfNeeded}
      >
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
