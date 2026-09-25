import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity, useInvalidate } from '@refinedev/core';
import { App, Button, Divider, Modal } from 'antd';

import ContactsShareList from './ContactsShareList';
import GeneralAccess from './GeneralAccess';
import useOutbox from '../../hooks/useOutbox';
import useActivityCollection from '../../hooks/useActivityCollection';
import type { EventRecord, Identity, InvitationState } from '../../types';

type Props = {
  event: EventRecord;
  open: boolean;
  onClose: () => void;
};

const ShareDialog = ({ event, open, onClose }: Props) => {
  const { t } = useTranslation();
  const { message: toast } = App.useApp();
  const { data: identity } = useGetIdentity<Identity>();
  const outbox = useOutbox();

  const creatorUri = event['dc:creator'];
  const isCreator = creatorUri === identity?.id;

  const { items: announces, refetch: refetchAnnounces } = useActivityCollection(event['apods:announces']);
  const { items: announcers, refetch: refetchAnnouncers } = useActivityCollection(
    isCreator ? event['apods:announcers'] : undefined
  );
  const invalidate = useInvalidate();

  const [invitations, setInvitations] = useState<Record<string, InvitationState>>({});
  const [savedInvitations, setSavedInvitations] = useState<Record<string, InvitationState>>({});
  const [newInvitations, setNewInvitations] = useState<Record<string, InvitationState>>({});
  const [sending, setSending] = useState(false);

  // Populate present invitations: anyone already in `announces`/`announcers` is readonly.
  useEffect(() => {
    const initial: Record<string, InvitationState> = {};
    [...announces, ...announcers].forEach(actorUri => {
      const canView = announces.includes(actorUri);
      const canShare = announcers.includes(actorUri);
      initial[actorUri] = { canView, canShare, viewReadonly: canView, shareReadonly: canShare };
    });
    setInvitations(initial);
    setSavedInvitations(initial);
  }, [announces, announcers]);

  const onChange = useCallback(
    (changedRights: Record<string, InvitationState>) => {
      const merged = { ...newInvitations, ...changedRights };
      const changed: Record<string, InvitationState> = {};
      Object.entries(merged).forEach(([actorUri, next]) => {
        const previous = savedInvitations[actorUri];
        const viewChanged = !!next.canView !== (!!previous?.canView || !!previous?.canShare);
        const shareChanged = !!next.canShare !== !!previous?.canShare;
        if (viewChanged || shareChanged) changed[actorUri] = next;
      });
      setNewInvitations(changed);
      setInvitations({ ...savedInvitations, ...changed });
    },
    [newInvitations, savedInvitations]
  );

  const sendInvitations = async () => {
    setSending(true);
    try {
      // Same shapes as @activitypods/react's ShareDialog for ActivityPods 2.3 (see the pod-provider's
      // `announcer` service). Everyone, creator or delegate, posts a plain `Announce`: the backend
      // accepts it from a non-creator only if they're in `apods:announcers`. Share rights are
      // granted by the creator with `interop:delegationAllowed`, which also grants view rights.
      const actorsWithNewShareRight = Object.keys(newInvitations).filter(uri => newInvitations[uri].canShare);
      const actorsWithNewViewRight = Object.keys(newInvitations).filter(
        uri => newInvitations[uri].canView && !newInvitations[uri].canShare
      );

      if (actorsWithNewViewRight.length > 0) {
        await outbox.post({
          type: 'Announce',
          actor: outbox.owner,
          object: event.id,
          to: actorsWithNewViewRight
        });
      }

      if (actorsWithNewShareRight.length > 0) {
        await outbox.post({
          type: 'Announce',
          actor: outbox.owner,
          object: event.id,
          to: actorsWithNewShareRight,
          'interop:delegationAllowed': true,
          'interop:delegationLimit': 1
        });
      }

      toast.success(t('share.invitation_sent', { count: Object.keys(newInvitations).length }));

      // The Pod may have just attached apods:announces/apods:announcers to the event for the
      // first time (if this was the first share ever) — refetch the event itself so its props
      // pick up the new collection URIs, and refetch the collections directly for immediate
      // feedback next time this dialog opens rather than waiting on the event refetch to land.
      invalidate({ resource: 'event', id: event.id, invalidates: ['detail'] });
      refetchAnnounces();
      refetchAnnouncers();

      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSending(false);
  };

  if (!identity) return null;

  return (
    <Modal
      title={t('actions.share')}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t('actions.close')}
        </Button>,
        Object.keys(newInvitations).length > 0 && (
          <Button key="send" type="primary" onClick={sendInvitations} loading={sending}>
            {t('share.send_invitation', { count: Object.keys(newInvitations).length })}
          </Button>
        )
      ]}
    >
      <ContactsShareList invitations={invitations} organizerUri={creatorUri} isCreator={isCreator} onChange={onChange} />

      {/* Organizer only: the credential behind the link lives on their Pod, so a delegate could
          neither read the current setting nor change it. */}
      {isCreator && (
        <>
          <Divider style={{ marginTop: 16, marginBottom: 16 }} />

          <div style={{ fontWeight: 500, marginBottom: 8 }}>{t('share.general_access')}</div>
          <GeneralAccess event={event} />
        </>
      )}
    </Modal>
  );
};

export default ShareDialog;
