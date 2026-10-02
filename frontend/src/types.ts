/** The identity shape returned by `@activitypods/refine-providers`'s `authProvider.getIdentity()`. */
export type Identity = {
  id: string;
  name: string;
  avatar?: string;
};

export type EventRecord = {
  id: string;
  name: string;
  image?: string | string[];
  startTime: string;
  endTime: string;
  content: string;
  location?: string;
  'dc:creator': string;
  'apods:hasFormat'?: string;
  'apods:hasStatus'?: string | string[];
  'apods:attendees'?: string;
  'apods:announces'?: string;
  'apods:announcers'?: string;
  'apods:maxAttendees'?: number;
  'apods:closingTime'?: string;
  'apods:otherConditions'?: string;
  [key: string]: any;
};

export type LocationRecord = {
  id: string;
  'vcard:given-name'?: string;
  'vcard:note'?: string;
  'vcard:hasAddress'?: {
    'vcard:given-name'?: string;
    'vcard:hasGeo'?: { 'vcard:latitude'?: number; 'vcard:longitude'?: number };
  };
  [key: string]: any;
};

export type FormatRecord = {
  id: string;
  /** The display name. `formats-importer.service.js` — the real seeding path (`call
   *  importers.formats.freshImport`) documented in the README — writes this, not `name`. */
  'rdfs:label'?: string;
  /** Optional parent category, for a breadcrumb — populated by the importer via `data.parent`. */
  'skos:broader'?: string;
  summary?: string;
  image?: string;
  'apods:recipe'?: string;
  [key: string]: any;
};

export type ProfileRecord = {
  id: string;
  describes: string;
  'vcard:given-name'?: string;
  'vcard:photo'?: string;
  [key: string]: any;
};

export type GroupRecord = {
  id: string;
  'vcard:label'?: string;
  'vcard:photo'?: string;
  'vcard:hasMember'?: string | string[];
  [key: string]: any;
};

export type InvitationState = {
  canView: boolean;
  canShare: boolean;
  /** Already granted before this dialog session opened — the switch can't be turned back off here. */
  viewReadonly: boolean;
  shareReadonly: boolean;
};
