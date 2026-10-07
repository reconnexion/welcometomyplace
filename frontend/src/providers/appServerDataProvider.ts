import type { DataProvider } from '@refinedev/core';
import type { AuthProvider } from '@activitypods/refine-providers';
import { applyFilters, applySorters, arrayOf, fetchJson, normalizeRecord } from '@activitypods/refine-providers/utils';

import urlJoin from '../utils/urlJoin';
import { BACKEND_URL } from '../config/env';

// The backend's own merged JSON-LD context (apods/interop/skos/... prefixes, with reference
// properties correctly typed `@type: "@id"`) — see providers/index.ts for why this matters.
const JSON_CONTEXT = ['https://www.w3.org/ns/activitystreams', urlJoin(new URL(BACKEND_URL).origin, '.well-known/context.jsonld')];

type AppServerResourceConfig = {
  /** Full URL of the LDP container this resource lives in, on the app's own backend. */
  containerUri: string;
  /** JSON-LD type(s) set on resources created in this container. */
  types: string | string[];
};

type AppServerDataProviderConfig = {
  authProvider: AuthProvider;
  resources: Record<string, AppServerResourceConfig>;
};

/**
 * A minimal Refine data provider for resources hosted on the app's own backend (not the user's
 * Pod) — e.g. the public `Format` catalog, stored in a plain LDP container with anonymous read /
 * any-authenticated-user write access (see `backend/services/formats.service.js`). Unlike the
 * main ActivityPods data provider, there's no per-user type-index discovery: the container URL
 * is fixed and configured directly.
 */
const appServerDataProvider = ({ authProvider, resources }: AppServerDataProviderConfig): DataProvider => {
  const requireResourceConfig = (resource: string): AppServerResourceConfig => {
    const config = resources[resource];
    if (!config) throw new Error(`Resource "${resource}" is not configured`);
    return config;
  };

  const getToken = () => authProvider.getSession()?.token;

  // Reads are always anonymous: `formats.service.js` (and any other resource hosted on this
  // provider) grants `anon: { read: true }`, and this app backend — unlike the Pod provider —
  // has no `auth` service to validate a bearer token against. Sending one anyway makes the LDP
  // catch-all route's authenticate hook call the (nonexistent) `auth.authenticate` action, which
  // fails with a `ServiceNotFoundError` that Moleculer serializes as an unrelated-looking 404.
  const fetchOne = async (id: string) => {
    const { json } = await fetchJson(id);
    return normalizeRecord(json, json['@context']);
  };

  return {
    getApiUrl: () => '',

    getList: async ({ resource, pagination, sorters, filters }) => {
      const { containerUri } = requireResourceConfig(resource);
      const { json: container } = await fetchJson(containerUri);
      let records = arrayOf(container['ldp:contains']).map(item => normalizeRecord(item, container['@context']));

      records = applyFilters(records, filters);
      records = applySorters(records, sorters);

      const total = records.length;

      if (pagination && pagination.mode !== 'off') {
        const currentPage = pagination.currentPage ?? 1;
        const pageSize = pagination.pageSize ?? 10;
        records = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);
      }

      return { data: records as any, total };
    },

    getOne: async ({ id }) => ({ data: (await fetchOne(`${id}`)) as any }),

    getMany: async ({ ids }) => {
      const results = await Promise.allSettled(ids.map(id => fetchOne(`${id}`)));
      const data = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map(r => r.value);
      return { data: data as any };
    },

    create: async ({ resource, variables }) => {
      const { containerUri, types } = requireResourceConfig(resource);
      const { headers } = await fetchJson(
        containerUri,
        { method: 'POST', body: JSON.stringify({ '@context': JSON_CONTEXT, '@type': types, ...variables }) },
        getToken()
      );
      const location = headers.get('Location');
      if (!location) throw new Error(`The server did not return a Location header when creating a resource in ${containerUri}`);
      return { data: (await fetchOne(location)) as any };
    },

    update: async ({ id, variables }) => {
      // PUT replaces the whole resource — merge the current one in first, same reasoning as the
      // main ActivityPods data provider's update() (see providers/index.ts's usage of it).
      const { id: _id, '@context': _context, ...current } = await fetchOne(`${id}`);
      await fetchJson(
        `${id}`,
        { method: 'PUT', body: JSON.stringify({ '@context': JSON_CONTEXT, ...current, ...variables }) },
        getToken()
      );
      return { data: (await fetchOne(`${id}`)) as any };
    },

    deleteOne: async ({ id }) => {
      await fetchJson(`${id}`, { method: 'DELETE' }, getToken());
      return { data: { id } as any };
    }
  };
};

export default appServerDataProvider;
