import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useList } from '@refinedev/core';
import { Button, Select, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import AddLocationModal from './AddLocationModal';
import type { LocationRecord } from '../../types';

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

const LocationSelect = ({ value, onChange }: Props) => {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const { result, query } = useList<LocationRecord>({ resource: 'location', pagination: { mode: 'off' } });

  return (
    <>
      <Space.Compact style={{ width: '100%' }}>
        <Select
          value={value}
          onChange={onChange}
          loading={query.isLoading}
          placeholder={t('event.select_location')}
          style={{ flex: 1 }}
          options={result.data.map((location: LocationRecord) => ({
            value: location.id,
            label: location['vcard:given-name']
          }))}
        />
        <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          {t('actions.add')}
        </Button>
      </Space.Compact>
      <AddLocationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={locationUri => {
          setModalOpen(false);
          onChange?.(locationUri);
        }}
      />
    </>
  );
};

export default LocationSelect;
