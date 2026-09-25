import { authProvider as apAuthProvider, dataProvider as apDataProvider } from '@activitypods/refine-providers';
import urlJoin from '../utils/urlJoin';
import { BACKEND_URL, CLIENT_ID, SHAPE_REPOSITORY_URL } from '../config/env';
import appServerDataProvider from './appServerDataProvider';
import { getCurrentCapabilityToken } from '../utils/capability';

export const authProvider = apAuthProvider({
  clientId: CLIENT_ID,
  // `AntdBackgroundChecks` (see `components/layout/PageLayout.tsx`) already polls the app status
  // and covers the re-consent case, no need for the auth provider's own poll on top of it.
  appStatusCheckInterval: false
});

/** Reads go through whichever credential the visitor actually has: the logged-in user's own
 *  token, or — for someone who opened a public event link while logged out — the capability
 *  presentation that link carries (see `utils/capability.ts`). Only the *data provider* is given
 *  this; everything that writes (`useOutbox`, the VC endpoints) still requires a real session and
 *  keeps using `authProvider` directly. The Pod accepts the presentation as a bearer token on
 *  every LDP route, so no other plumbing is needed to make the read work. */
const readAuthProvider: typeof authProvider = {
  ...authProvider,
  getSession: () => {
    const session = authProvider.getSession();
    if (session) return session;
    const token = getCurrentCapabilityToken();
    // A capability identifies no one, hence the empty WebID: the data provider only uses it to
    // discover containers, which capability-based reads (always of a known URI) never need.
    return token ? { token, webId: '' } : undefined;
  }
};

/** Merges in the backend's own JSON-LD context (`apods`, `interop`, `skos`... prefixes, with
 *  reference properties like `apods:hasFormat` correctly typed `@type: "@id"`), matching the old
 *  app's `dataProvider.js`. Without it, `apods:`-prefixed reference fields still get submitted,
 *  but as plain string literals rather than resource links — silently unusable server-side. */
const JSON_CONTEXT = ['https://www.w3.org/ns/activitystreams', urlJoin(new URL(BACKEND_URL).origin, '.well-known/context.jsonld')];

/** Resources living on the logged-in user's own Pod, discovered via shape trees. */
export const dataProvider = apDataProvider({
  authProvider: readAuthProvider,
  jsonContext: JSON_CONTEXT,
  resources: {
    event: {
      shapeTreeUri: urlJoin(SHAPE_REPOSITORY_URL, 'shapetrees/as/Event')
    },
    location: {
      shapeTreeUri: urlJoin(SHAPE_REPOSITORY_URL, 'shapetrees/vcard/Location')
    },
    profile: {
      shapeTreeUri: urlJoin(SHAPE_REPOSITORY_URL, 'shapetrees/as/Profile')
    },
    group: {
      shapeTreeUri: urlJoin(SHAPE_REPOSITORY_URL, 'shapetrees/vcard/Group')
    }
  }
});

/** Resources hosted on the app's own backend (public catalog), not on the user's Pod. */
export const formatDataProvider = appServerDataProvider({
  authProvider,
  resources: {
    format: {
      containerUri: urlJoin(BACKEND_URL, 'apods/event-format'),
      types: 'apods:EventFormat'
    }
  }
});
