import { useState } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useCreate, useGetIdentity } from '@refinedev/core';
import { App, Button, DatePicker, Modal } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

import type { EventRecord, Identity } from '../../types';

type Props = {
  event: EventRecord;
};

const CloneEventButton = ({ event }: Props) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { data: identity } = useGetIdentity<Identity>();

  const creatorUri = event['dc:creator'];
  if (!creatorUri || creatorUri !== identity?.id) return null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState<Dayjs | null>(null);

  const originalStartTime = dayjs(event.startTime);

  const { mutate: createEvent, mutation } = useCreate();

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setNewStartDate(originalStartTime);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setNewStartDate(null);
  };

  const handleClone = () => {
    if (!newStartDate || !identity) return;

    const originalEndTime = dayjs(event.endTime);
    const duration = originalEndTime.diff(originalStartTime, 'millisecond');

    const newEndTime = newStartDate.add(duration, 'millisecond');

    const clonedEvent: Omit<EventRecord, 'id' | 'dc:creator'> & { 'dc:creator'?: string } = {
      name: event.name,
      startTime: newStartDate.toISOString(),
      endTime: newEndTime.toISOString(),
      content: event.content,
      'apods:hasFormat': event['apods:hasFormat'],
      location: event.location,
      image: event.image,
      'apods:maxAttendees': event['apods:maxAttendees'],
      'apods:closingTime': event['apods:closingTime'],
      'apods:otherConditions': event['apods:otherConditions']
    };

    createEvent(
      {
        resource: 'event',
        values: clonedEvent
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setNewStartDate(null);
          message.success(t('event.clone_success'));
        },
        onError: () => {
          message.error(t('event.clone_error'));
        }
      }
    );
  };

  const isFormValid = !!newStartDate;

  return (
    <>
      <Button
        type="text"
        className="ap-btn-text-action"
        icon={<CopyOutlined />}
        onClick={handleOpenModal}
      >
        {t('event.clone')}
      </Button>

      <Modal
        title={t('event.clone_dialog_title')}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            {t('actions.cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={mutation.isPending}
            onClick={handleClone}
            disabled={!isFormValid}
          >
            {t('actions.save')}
          </Button>
        ]}
      >
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            {t('event.clone_new_date')}
          </label>
          <DatePicker
            value={newStartDate}
            onChange={setNewStartDate}
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            style={{ width: '100%' }}
            disabledDate={current => current.isBefore(dayjs(), 'day')}
          />
        </div>
      </Modal>
    </>
  );
};

export default CloneEventButton;
