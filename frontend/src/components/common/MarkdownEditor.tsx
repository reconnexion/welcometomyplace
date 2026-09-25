import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Tabs } from 'antd';

import MarkdownContent from './MarkdownContent';

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
};

/** Write/Preview markdown editor (matches the old app's `react-mde`-based `MarkdownInput` UX),
 *  `Form.Item`-compatible via `value`/`onChange`. */
const MarkdownEditor = ({ value, onChange, rows = 10 }: Props) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  return (
    <Tabs
      activeKey={tab}
      onChange={key => setTab(key as 'write' | 'preview')}
      size="small"
      items={[
        {
          key: 'write',
          label: t('markdown.write'),
          children: <Input.TextArea value={value} onChange={e => onChange?.(e.target.value)} rows={rows} />
        },
        {
          key: 'preview',
          label: t('markdown.preview'),
          children: (
            <div style={{ minHeight: rows * 22, border: '1px solid #d9d9d9', borderRadius: 8, padding: 12 }}>
              <MarkdownContent>{value}</MarkdownContent>
            </div>
          )
        }
      ]}
    />
  );
};

export default MarkdownEditor;
