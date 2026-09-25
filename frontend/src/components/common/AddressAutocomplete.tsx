import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoComplete, Input } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

import { parseAddressFeature, searchAddress, type MapboxFeature } from '../../config/mapbox';

type Props = {
  value?: ReturnType<typeof parseAddressFeature>;
  onChange?: (value: ReturnType<typeof parseAddressFeature>) => void;
};

/** Mapbox-backed address search (only the geocoding API is used, not Mapbox GL/map display —
 *  see the plan's decision to keep Leaflet for map rendering). `Form.Item`-compatible. */
const AddressAutocomplete = ({ value, onChange }: Props) => {
  const { t, i18n } = useTranslation();
  const [keyword, setKeyword] = useState(value?.['vcard:given-name'] ?? '');
  const [features, setFeatures] = useState<MapboxFeature[]>([]);
  const throttleRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!keyword || keyword === value?.['vcard:given-name']) return;
    clearTimeout(throttleRef.current);
    throttleRef.current = setTimeout(() => {
      searchAddress(keyword, i18n.language).then(setFeatures);
    }, 200);
    return () => clearTimeout(throttleRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const options = useMemo(
    () =>
      features.map(feature => ({
        value: feature.place_name,
        feature
      })),
    [features]
  );

  return (
    <AutoComplete
      value={keyword}
      options={options}
      onSearch={setKeyword}
      onSelect={(value: string, option: any) => {
        setKeyword(value);
        setFeatures([]);
        onChange?.(parseAddressFeature(option.feature));
      }}
      style={{ width: '100%' }}
    >
      <Input prefix={<EnvironmentOutlined />} placeholder={t('event.search_address')} />
    </AutoComplete>
  );
};

export default AddressAutocomplete;
