import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

import useUploadImage from '../../hooks/useUploadImage';

type Props = {
  value?: string;
  onChange?: (value: string | undefined) => void;
};

/** A single-image upload field (Antd `Form.Item`-compatible via `value`/`onChange`), uploading
 *  straight to the user's Pod and storing the resulting URL as the field value. */
const ImageUpload = ({ value, onChange }: Props) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const uploadImage = useUploadImage();
  const [uploading, setUploading] = useState(false);

  const customRequest: UploadProps['customRequest'] = async options => {
    const file = options.file as File;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange?.(url);
      options.onSuccess?.({});
    } catch (e: any) {
      message.error(e.message);
      options.onError?.(e);
    }
    setUploading(false);
  };

  return (
    <Upload
      listType="picture-card"
      showUploadList={false}
      accept="image/*"
      customRequest={customRequest}
      maxCount={1}
    >
      {value ? (
        <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div>
          {uploading ? '...' : <PlusOutlined />}
          <div style={{ marginTop: 8 }}>{t('actions.upload')}</div>
        </div>
      )}
    </Upload>
  );
};

export default ImageUpload;
