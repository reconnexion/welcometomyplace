import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { App, Alert, Button, Form, Input } from 'antd';
import { SendOutlined } from '@ant-design/icons';

import BodyLabel from '../common/BodyLabel';
import useOutbox from '../../hooks/useOutbox';
import useActivityCollection from '../../hooks/useActivityCollection';
import type { EventRecord, Identity } from '../../types';

type Props = {
  event: EventRecord;
};

/** Message-the-organizer (or, if you're the organizer, message-all-attendees) form embedded at
 *  the bottom of the event page. Sends a plain `Note` activity to the recipient's inbox. */
const ContactField = ({ event }: Props) => {
  const { t } = useTranslation();
  const { message: toast } = App.useApp();
  const { data: identity } = useGetIdentity<Identity>();
  const outbox = useOutbox();
  const { items: contacts, isLoading: contactsLoading } = useActivityCollection('apods:contacts');
  const { items: attendees } = useActivityCollection(event['apods:attendees']);
  const [form] = Form.useForm();

  if (!identity) return null;

  const isOwner = identity.id === event['dc:creator'];
  const label = t(isOwner ? 'event.contact_attendees' : 'event.contact_organizer');

  const onFinish = async (values: { content: string }) => {
    try {
      await outbox.post({
        type: 'Note',
        attributedTo: outbox.owner,
        summary: t('event.event_message_title', { username: identity.name, event: event.name }),
        content: values.content,
        context: event.id,
        to: isOwner ? attendees.filter(uri => uri !== event['dc:creator']) : event['dc:creator']
      });
      toast.success(t('event.message_sent'));
      form.resetFields();
    } catch (e: any) {
      toast.error(t('event.message_send_error', { error: e.message }));
    }
  };

  return (
    <div>
      <BodyLabel>{label}</BodyLabel>
      {!isOwner && !contactsLoading && !contacts.includes(event['dc:creator']) && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={t('event.message_profile_show_right')} />
      )}
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="content" rules={[{ required: true }]}>
          <Input.TextArea rows={4} placeholder={t('event.message')} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
            {t('event.send')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ContactField;
