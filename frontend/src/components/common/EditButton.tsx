import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { Link } from 'react-router';

import type { Identity } from '../../types';

type Props = {
  /** URI of the record's creator (`dc:creator`) — only they get edit rights, matching how the
   *  Pod grants `acl:Control` to the creator on resource creation. */
  creatorUri?: string;
  to: string;
};

const EditButton = ({ creatorUri, to }: Props) => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Identity>();

  if (!creatorUri || creatorUri !== identity?.id) return null;

  return (
    <Link to={to}>
      <Button type="text" className="ap-btn-text-action" icon={<EditOutlined />}>
        {t('event.edit')}
      </Button>
    </Link>
  );
};

export default EditButton;
