import { useOne } from '@refinedev/core';
import { Alert, Grid, Spin } from 'antd';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

import type { LocationRecord } from '../../types';

type Props = {
  locationUri?: string;
};

const HostLocationMap = ({ locationUri }: Props) => {
  const screens = Grid.useBreakpoint();
  const { result: location, query } = useOne<LocationRecord>({
    resource: 'location',
    id: locationUri,
    queryOptions: { enabled: !!locationUri }
  });

  if (!locationUri) return null;
  if (query.isLoading) return <Spin />;
  const geo = location?.['vcard:hasAddress']?.['vcard:hasGeo'];
  const lat = geo?.['vcard:latitude'];
  const lng = geo?.['vcard:longitude'];
  const address = [location?.['vcard:given-name'], location?.['vcard:hasAddress']?.['vcard:given-name']]
    .filter(Boolean)
    .join(', ');

  return (
    <div>
      {address && <div style={{ marginBottom: 12 }}>{address}</div>}
      {location?.['vcard:note'] && (
        <Alert style={{ marginBottom: 12 }} type="info" message={<>{location['vcard:note']}</>} />
      )}
      {lat && lng && (
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          style={{ height: screens.sm ? 400 : 250, width: '100%', borderRadius: 8 }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]}>{address && <Popup>{address}</Popup>}</Marker>
        </MapContainer>
      )}
    </div>
  );
};

export default HostLocationMap;
