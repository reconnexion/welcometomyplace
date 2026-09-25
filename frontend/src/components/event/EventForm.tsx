import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useList } from '@refinedev/core';
import { Alert, Col, DatePicker, Form, Input, InputNumber, Row, Select, type FormInstance } from 'antd';

import LocationSelect from './LocationSelect';
import ImageUpload from '../common/ImageUpload';
import MarkdownEditor from '../common/MarkdownEditor';
import BodyLabel from '../common/BodyLabel';
import type { FormatRecord } from '../../types';

type Props = {
  form: FormInstance;
};

const toDayjs = (value?: string) => (value ? dayjs(value) : undefined);
const fromDayjs = (value?: Dayjs) => value?.toISOString();

// Grey out hours/minutes strictly before `reference` (used when the picked date is the same day
// as `reference` — an earlier day is already fully disabled by the corresponding `disabledDate`).
const disableHoursMinutesBefore = (reference: Dayjs) => ({
  disabledHours: () => Array.from({ length: reference.hour() }, (_, i) => i),
  disabledMinutes: (selectedHour: number) =>
    selectedHour === reference.hour() ? Array.from({ length: reference.minute() + 1 }, (_, i) => i) : []
});

// Grey out hours/minutes at or after `reference` (the mirror image, for "must be before X" fields).
const disableHoursMinutesFrom = (reference: Dayjs) => ({
  disabledHours: () => Array.from({ length: 24 - reference.hour() }, (_, i) => reference.hour() + i),
  disabledMinutes: (selectedHour: number) =>
    selectedHour === reference.hour() ? Array.from({ length: 60 - reference.minute() }, (_, i) => reference.minute() + i) : []
});

const disabledStartDate = (current: Dayjs) => current.isBefore(dayjs(), 'day');

// Only relevant once a date is picked: if it's today, also grey out hours/minutes already past —
// picking a future date has no such restriction.
const disabledStartTime = (current: Dayjs | null) =>
  current && current.isSame(dayjs(), 'day') ? disableHoursMinutesBefore(dayjs()) : {};

const EventForm = ({ form }: Props) => {
  const { t } = useTranslation();
  const { result: formats } = useList<FormatRecord>({
    resource: 'format',
    pagination: { mode: 'off' },
    sorters: [{ field: 'rdfs:label', order: 'asc' }]
  });

  // Must be after startTime — falls back to "not in the past" until startTime is picked.
  const disabledEndDate = (current: Dayjs) => {
    const startTime = form.getFieldValue('startTime');
    return current.isBefore(startTime ? dayjs(startTime) : dayjs(), 'day');
  };
  const disabledEndTime = (current: Dayjs | null) => {
    const startTime = form.getFieldValue('startTime');
    const reference = startTime ? dayjs(startTime) : dayjs();
    return current && current.isSame(reference, 'day') ? disableHoursMinutesBefore(reference) : {};
  };

  // Must be before startTime, and not in the past.
  const disabledClosingDate = (current: Dayjs) => {
    if (current.isBefore(dayjs(), 'day')) return true;
    const startTime = form.getFieldValue('startTime');
    return !!startTime && current.isAfter(dayjs(startTime), 'day');
  };
  const disabledClosingTime = (current: Dayjs | null) => {
    if (!current) return {};
    const startTime = form.getFieldValue('startTime');
    if (startTime && current.isSame(dayjs(startTime), 'day')) return disableHoursMinutesFrom(dayjs(startTime));
    return current.isSame(dayjs(), 'day') ? disableHoursMinutesBefore(dayjs()) : {};
  };

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          <>
            {t('event.first_event_help')}{' '}
            <a href="https://forum.reconnexion.coop" target="_blank" rel="noopener noreferrer">
              {t('event.forum_name')}
            </a>
          </>
        }
      />

      <Form.Item name="name" label={t('event.title')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="startTime"
            label={t('event.start_time')}
            getValueProps={value => ({ value: toDayjs(value) })}
            normalize={fromDayjs}
            rules={[
              { required: true },
              {
                // `value` here is already the normalized ISO string (Form.Item runs rules against
                // the stored value, i.e. post-`normalize`), not the Dayjs object the picker emits.
                validator: async (_, value: string) => {
                  if (value && dayjs(value).isBefore(dayjs())) return Promise.reject(t('validation.future_date'));
                }
              }
            ]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              disabledDate={disabledStartDate}
              disabledTime={disabledStartTime}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="endTime"
            label={t('event.end_time')}
            getValueProps={value => ({ value: toDayjs(value) })}
            normalize={fromDayjs}
            dependencies={['startTime']}
            rules={[
              { required: true },
              {
                validator: async (_, value: string) => {
                  const startTime = form.getFieldValue('startTime');
                  if (value && startTime && !dayjs(value).isAfter(dayjs(startTime))) {
                    return Promise.reject(t('validation.after_start_time'));
                  }
                }
              }
            ]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              disabledDate={disabledEndDate}
              disabledTime={disabledEndTime}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="location" label={t('event.location')}>
        <LocationSelect />
      </Form.Item>

      <Form.Item name="image" label={t('event.image')}>
        <ImageUpload />
      </Form.Item>

      <Form.Item name="content" label={t('event.content')} rules={[{ required: true }]}>
        <MarkdownEditor />
      </Form.Item>

      <Form.Item name="apods:hasFormat" label={t('event.event_type')} rules={[{ required: true }]}>
        <Select options={formats.data.map((format: FormatRecord) => ({ value: format.id, label: format['rdfs:label'] }))} />
      </Form.Item>

      <BodyLabel>{t('event.conditions')}</BodyLabel>

      <Form.Item
        name="apods:closingTime"
        label={t('event.closing_time')}
        getValueProps={value => ({ value: toDayjs(value) })}
        normalize={fromDayjs}
        dependencies={['startTime']}
        rules={[
          {
            validator: async (_, value: string) => {
              const startTime = form.getFieldValue('startTime');
              if (value && startTime && !dayjs(value).isBefore(dayjs(startTime))) {
                return Promise.reject(t('validation.before_start_time'));
              }
            }
          }
        ]}
      >
        <DatePicker
          showTime={{ format: 'HH:mm' }}
          format="DD/MM/YYYY HH:mm"
          disabledDate={disabledClosingDate}
          disabledTime={disabledClosingTime}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item name="apods:maxAttendees" label={t('event.max_attendees')} help={t('event.max_attendees_help')}>
        <InputNumber min={1} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="apods:otherConditions" label={t('event.other_conditions')} help={t('event.other_conditions_help')}>
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );
};

export default EventForm;
