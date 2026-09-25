import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';

import ImageUpload from '../common/ImageUpload';
import MarkdownEditor from '../common/MarkdownEditor';

const FormatForm = () => {
  const { t } = useTranslation();

  return (
    <>
      <Form.Item name="rdfs:label" label={t('format.name')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="summary" label={t('format.summary')} rules={[{ required: true }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="image" label={t('event.image')}>
        <ImageUpload />
      </Form.Item>
      <Form.Item name="apods:recipe" label={t('format.recipe')} rules={[{ required: true }]}>
        <MarkdownEditor />
      </Form.Item>
    </>
  );
};

export default FormatForm;
