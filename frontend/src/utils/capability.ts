import { arrayOf, fetchJson } from '@activitypods/refine-providers/utils';

import urlJoin from './urlJoin';

/** VC API version mounted by the Pod provider (`VC_API_PATH` in `@semapps/crypto`). */
const VC_API_PATH = 'vc/v0.3';

/** Mirrors the Pod's own `credentialsContext` (`@semapps/crypto`'s constants) so the credential
 *  we ask it to issue expands to exactly the RDF it stores and signs. */
export const credentialContext = [
  'https://www.w3.org/ns/credentials/v2',
  {
    as: 'https://www.w3.org/ns/activitystreams#',
    apods: 'http://activitypods.org/ns/core#',
    acl: 'http://www.w3.org/ns/auth/acl#'
  }
];

/** `schema:name` on the credentials this app issues, to tell them apart from the Pod provider's
 *  own "Invite Link" contact capabilities, which live in the same container. */
const EVENT_LINK_NAME = 'Event Link';

export type Capability = Record<string, any>;

/**
 * Query the Pod's own SPARQL endpoint, with the user's token. This is how credentials have to be
 * looked up: the credentials container deliberately grants read access to nobody (see
 * `VCCredentialsContainer`'s `permissions` in `@semapps/crypto`, which only ever returns an
 * `anyUser` entry, false on a Pod provider), so it cannot be listed even by its owner. The
 * ActivityPods frontend reaches its own invite-link credentials the same way — react-admin's
 * semantic data provider sends `getList` through `fetchSparqlEndpoints` unless a resource opts
 * into `list.fetchContainer`, which `VerifiableCredential` doesn't.
 */
const sparqlSelect = async (webId: string, token: string, query: string): Promise<any[]> => {
  const response = await fetch(urlJoin(webId, 'sparql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sparql-query',
      Accept: 'application/sparql-results+json',
      Authorization: `Bearer ${token}`
    },
    body: query
  });
  if (!response.ok) throw new Error(`Could not query ${webId}'s SPARQL endpoint (${response.status})`);
  const json = await response.json();
  // ActivityPods answers with a plain array of bindings rather than the SPARQL JSON envelope
  return Array.isArray(json) ? json : (json?.results?.bindings ?? []);
};

const vcApiUri = (webId: string, path: string) => urlJoin(urlJoin(webId, VC_API_PATH), path);

const base64urlEncode = (str: string) => {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, byte => String.fromCodePoint(byte)).join('');
  return btoa(binString).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

/** Ported from the ActivityPods frontend's own `utils.ts`. The Pod accepts an *unsigned*
 *  VerifiablePresentation, encoded as a JWT, as a bearer token on every LDP route (they all set
 *  `authorizeWithCapability`) — that is what lets a logged-out visitor read the resources a
 *  credential grants `acl:Read` on. */
const createUnsignedJwt = (payload: object) => {
  const header = base64urlEncode(JSON.stringify({ typ: 'JWT', alg: 'none' }));
  return `${header}.${base64urlEncode(JSON.stringify(payload))}.`;
};

/** The bearer token a logged-out visitor reads Pod resources with. */
export const capabilityToken = (capability: Capability) =>
  createUnsignedJwt({
    '@context': credentialContext,
    type: 'VerifiablePresentation',
    verifiableCredential: [capability]
  });

/*
 * The capability currently in play, kept outside React so that the data provider — created once
 * at module load, well outside the component tree — can read through it. `useCapability` is what
 * populates it, from the `?cap=` search param.
 */
let currentCapability: { uri: string; capability: Capability } | undefined;

export const setCurrentCapability = (uri?: string, capability?: Capability) => {
  currentCapability = uri && capability ? { uri, capability } : undefined;
};

export const getCurrentCapability = (uri?: string) =>
  uri && currentCapability?.uri === uri ? currentCapability.capability : undefined;

export const getCurrentCapabilityToken = () =>
  currentCapability ? capabilityToken(currentCapability.capability) : undefined;

/** Fetch a resource through a capability rather than a session — used for the event image, which
 *  a plain `<img src>` could not authenticate. */
export const fetchWithCapability = (resourceUri: string, capability: Capability, accept = '*/*') =>
  fetch(resourceUri, {
    headers: { Accept: accept, Authorization: `Bearer ${capabilityToken(capability)}` }
  });

const grantsJoinOn = (capability: Capability, eventUri: string) =>
  arrayOf(capability?.credentialSubject).some((subject: any) =>
    arrayOf(subject?.['apods:hasActivityGrant']).some((grant: any) => {
      const object = grant?.['as:object']?.id ?? grant?.['as:object'];
      const types = arrayOf(grant?.type ?? grant?.['@type']);
      return object === eventUri && types.some((type: string) => type?.endsWith('Join'));
    })
  );

/**
 * Issue the credential behind a public event link — the same shape as the Pod provider's contact
 * invite links (`createContactCapability` in the ActivityPods frontend), with two grants:
 * - `apods:hasAuthorization`: `acl:Read` on the event and its satellites, so anyone holding the
 *   link can display the page while logged out;
 * - `apods:hasActivityGrant`: the right to send the organizer a `Join` for this event, which the
 *   app backend checks before accepting a registration from someone who was never invited.
 */
export const issueEventLinkCapability = async ({
  webId,
  token,
  eventUri,
  accessTo
}: {
  webId: string;
  token: string;
  eventUri: string;
  accessTo: string[];
}): Promise<Capability> => {
  const { json } = await fetchJson(
    vcApiUri(webId, 'credentials/issue'),
    {
      method: 'POST',
      body: JSON.stringify({
        credential: {
          '@context': credentialContext,
          type: 'VerifiableCredential',
          name: EVENT_LINK_NAME,
          credentialSubject: {
            'apods:hasActivityGrant': {
              type: 'as:Join',
              'as:to': { '@id': webId },
              'as:object': { '@id': eventUri }
            },
            'apods:hasAuthorization': {
              type: 'acl:Authorization',
              'acl:mode': 'acl:Read',
              // Plain URI strings, *not* `{ '@id': … }` node objects: semapps' `hasValidCapability`
              // compares `acl:accessTo` to the requested URI after a single `arrayOf()`, so a list
              // of node objects never matches (only a lone one does, through its `.id`). Round
              // -tripped through the Pod's triplestore, plain strings come back as plain strings.
              'acl:accessTo': accessTo
            }
          }
        }
      })
    },
    token
  );

  // `fetchJson` already throws on a non-2xx status, so an id is all that is left to confirm
  if (!json?.id) throw new Error('The Pod issued a credential without a URI to link to');

  return json;
};

/** Look for a link already issued for this event, so opening the dialog twice doesn't mint a
 *  second one. Returns `null` rather than `undefined` — react-query rejects `undefined`. */
export const findEventLinkCapability = async ({
  webId,
  token,
  eventUri
}: {
  webId: string;
  token: string;
  eventUri: string;
}): Promise<Capability | null> => {
  const rows = await sparqlSelect(
    webId,
    token,
    `PREFIX cred: <https://www.w3.org/2018/credentials#>
     PREFIX schema: <https://schema.org/>
     SELECT ?vc WHERE { ?vc a cred:VerifiableCredential ; schema:name "${EVENT_LINK_NAME}" }`
  );

  for (const row of rows) {
    const uri = row?.vc?.value;
    if (!uri) continue;
    // Which event a credential covers can only be read from its HTTP representation: the SPARQL
    // endpoint hands back the nested grant as blank nodes, losing the URIs it points at.
    const { json } = await fetchJson(uri, {}, token);
    if (grantsJoinOn(json, eventUri)) return json;
  }

  return null;
};

export const revokeCapability = (capabilityUri: string, token: string) =>
  fetchJson(capabilityUri, { method: 'DELETE' }, token);

/**
 * Build a presentation of `verifiableCredential` signed by `holder`, answering a challenge from
 * `verifier` — the proof, checked by the recipient's Pod, that whoever sends the activity really
 * holds the credential. Ported from the ActivityPods frontend's `createPresentation`.
 */
export const createPresentation = async ({
  token,
  holder,
  verifier,
  verifiableCredential
}: {
  token: string;
  holder: string;
  verifier: string;
  verifiableCredential: Capability;
}) => {
  // The challenges route is deliberately unauthenticated (see `VCApiService`)
  const {
    json: { challenge }
  } = await fetchJson(vcApiUri(verifier, 'challenges'), { method: 'POST' });

  const { json: presentation } = await fetchJson(
    vcApiUri(holder, 'presentations/'),
    {
      method: 'POST',
      body: JSON.stringify({
        presentation: {
          '@context': credentialContext,
          type: 'VerifiablePresentation',
          verifiableCredential: [verifiableCredential]
        },
        options: { challenge, persist: false }
      })
    },
    token
  );

  return presentation;
};

/** The shareable link: the ordinary event page, plus the credential that opens it. */
export const eventLinkUrl = (eventUri: string, capabilityUri: string) =>
  `${window.location.origin}/events/${encodeURIComponent(eventUri)}?cap=${encodeURIComponent(capabilityUri)}`;
