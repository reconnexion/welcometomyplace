import { useTranslation } from 'react-i18next';
import { useCreate, useGetIdentity } from '@refinedev/core';
import { Form, Input, Modal } from 'antd';

import AddressAutocomplete from '../common/AddressAutocomplete';
import type { Identity } from '../../types';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (locationUri: string) => void;
};

const AddLocationModal = ({ open, onClose, onCreated }: Props) => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: create, mutation } = useCreate();
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    create(
      { resource: 'location', values },
      {
        onSuccess: ({ data }) => {
          form.resetFields();
          onCreated(data.id as string);
        }
      }
    );
  };

  return (
    <Modal
      title={t('event.add_location')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ 'vcard:given-name': t('event.default_location_name', { name: identity?.name }) }}
      >
        <Form.Item name="vcard:given-name" label={t('event.location_name')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="vcard:hasAddress" label={t('event.search_address')} rules={[{ required: true }]}>
          <AddressAutocomplete />
        </Form.Item>
        <Form.Item name="vcard:note" label={t('event.location_comment')}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddLocationModal;
