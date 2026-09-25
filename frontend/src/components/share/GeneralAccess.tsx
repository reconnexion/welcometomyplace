import { useTranslation } from 'react-i18next';
import { App, Button, Input, Select, Space, Spin } from 'antd';
import { CopyOutlined, GlobalOutlined, LockOutlined } from '@ant-design/icons';

import useEventPublicLink from '../../hooks/useEventPublicLink';
import type { EventRecord } from '../../types';

type Props = {
  event: EventRecord;
};

/**
 * The "general access" block at the bottom of the share dialog, modelled on Google Docs: access
 * is restricted to invited users until the organizer opens it to anyone holding the link, at
 * which point (and only then) a credential is minted on their Pod and turned into a link.
 */
const GeneralAccess = ({ event }: Props) => {
  const { t } = useTranslation();
  const { message: toast } = App.useApp();
  const { isPublic, link, isLoading, isSaving, setPublic } = useEventPublicLink(event);

  const onChange = async (value: 'restricted' | 'public') => {
    try {
      await setPublic(value === 'public');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t('share.link_copied'));
    } catch {
      // Clipboard access can be denied (or unavailable outside a secure context); the link stays
      // selectable in the field next to the button
      toast.error(t('share.link_copy_error'));
    }
  };

  if (isLoading) return <Spin size="small" />;

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space align="start">
        {isPublic ? <GlobalOutlined style={{ fontSize: 18 }} /> : <LockOutlined style={{ fontSize: 18 }} />}
        <div>
          <Select<'restricted' | 'public'>
            value={isPublic ? 'public' : 'restricted'}
            onChange={onChange}
            disabled={isSaving}
            loading={isSaving}
            variant="borderless"
            popupMatchSelectWidth={false}
            options={[
              { value: 'restricted', label: t('share.access_restricted') },
              { value: 'public', label: t('share.access_anyone_with_link') }
            ]}
          />
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', paddingLeft: 11 }}>
            {t(isPublic ? 'share.access_anyone_with_link_help' : 'share.access_restricted_help')}
          </div>
        </div>
      </Space>

      {isPublic && link && (
        <Space.Compact style={{ width: '100%' }}>
          <Input readOnly value={link} onFocus={e => e.target.select()} />
          <Button icon={<CopyOutlined />} onClick={onCopy}>
            {t('share.copy_link')}
          </Button>
        </Space.Compact>
      )}
    </Space>
  );
};

export default GeneralAccess;
