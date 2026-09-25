import { MAPBOX_ACCESS_TOKEN } from './env';

export type MapboxFeature = {
  place_name: string;
  place_type: string[];
  text: string;
  address?: string;
  center: [number, number];
  context?: { id: string; text: string }[];
};

const extractContext = (context: MapboxFeature['context'], type: string): string | undefined =>
  context?.find(c => c.id.startsWith(`${type}.`))?.text;

/** Search addresses/places via the Mapbox Geocoding API. Returns an empty list (rather than
 *  throwing) when no access token is configured, matching the old app's "hide the address
 *  autocomplete if unconfigured" behavior. */
export const searchAddress = async (query: string, locale: string): Promise<MapboxFeature[]> => {
  if (!MAPBOX_ACCESS_TOKEN || !query) return [];

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN);
  url.searchParams.set('types', 'place,address');
  url.searchParams.set('country', 'fr,be,ch');
  url.searchParams.set('language', locale);

  const response = await fetch(url.toString());
  if (!response.ok) return [];
  const json = await response.json();
  return json.features ?? [];
};

/** Build a `vcard:Address` JSON-LD value from a selected Mapbox feature, matching the shape the
 *  Pod provider's `before.put` hook expects to compute `vcard:hasGeo` from. */
export const parseAddressFeature = (feature: MapboxFeature) => ({
  type: 'vcard:Address',
  'vcard:given-name': feature.place_name,
  'vcard:locality': feature.place_type[0] === 'place' ? feature.text : extractContext(feature.context, 'place'),
  'vcard:street-address':
    feature.place_type[0] === 'address' ? [feature.address, feature.text].filter(Boolean).join(' ') : undefined,
  'vcard:postal-code': extractContext(feature.context, 'postcode'),
  'vcard:country-name': extractContext(feature.context, 'country'),
  'vcard:hasGeo': {
    'vcard:longitude': feature.center[0],
    'vcard:latitude': feature.center[1]
  }
});
