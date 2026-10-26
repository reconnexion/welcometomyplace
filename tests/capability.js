const assert = require('node:assert/strict');
const urlJoin = require('url-join');
const { fetchAs } = require('./initialize');

// Same as frontend/src/utils/capability.ts
const credentialContext = [
  'https://www.w3.org/ns/credentials/v2',
  {
    as: 'https://www.w3.org/ns/activitystreams#',
    apods: 'http://activitypods.org/ns/core#',
    acl: 'http://www.w3.org/ns/auth/acl#'
  }
];

const base64url = str => Buffer.from(str).toString('base64url');

/** The unsigned presentation with which a logged-out visitor reads what a public link grants */
const capabilityToken = capability =>
  `${base64url(JSON.stringify({ typ: 'JWT', alg: 'none' }))}.${base64url(
    JSON.stringify({
      '@context': credentialContext,
      type: 'VerifiablePresentation',
      verifiableCredential: [capability]
    })
  )}.`;

/** Issue the credential of a public event link, like the share dialog's "general access" */
const issueEventLink = async (organizer, eventUri, accessTo) => {
  const { status, json } = await fetchAs(organizer, urlJoin(organizer.id, 'vc/v0.3/credentials/issue'), {
    method: 'POST',
    body: {
      credential: {
        '@context': credentialContext,
        type: 'VerifiableCredential',
        name: 'Event Link',
        credentialSubject: {
          'apods:hasActivityGrant': {
            type: 'as:Join',
            'as:to': { '@id': organizer.id },
            'as:object': { '@id': eventUri }
          },
          'apods:hasAuthorization': {
            type: 'acl:Authorization',
            'acl:mode': 'acl:Read',
            'acl:accessTo': accessTo
          }
        }
      }
    }
  });
  assert.ok([200, 201].includes(status), JSON.stringify(json));
  return json;
};

const fetchWithCapability = (url, capability) =>
  fetchAs(undefined, url, { headers: { Authorization: `Bearer ${capabilityToken(capability)}` } });

module.exports = { capabilityToken, issueEventLink, fetchWithCapability };
