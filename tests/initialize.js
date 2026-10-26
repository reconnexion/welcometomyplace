const path = require('path');
const fs = require('fs');
const urlJoin = require('url-join');
const Redis = require('ioredis');
const { ServiceBroker } = require('moleculer');
const assert = require('node:assert/strict');
const { arrayOf, delay } = require('@semapps/ldp');

const BACKEND_DIR = path.resolve(__dirname, '../backend');

const JENA_AUTH = `Basic ${Buffer.from('admin:admin').toString('base64')}`;
// See docker-compose.yml
const POD_PROVIDERS = [
  { baseUrl: 'http://localhost:3000/', fusekiUrl: 'http://localhost:3041/', redisUrl: 'redis://localhost:6390' },
  { baseUrl: 'http://localhost:3100/', fusekiUrl: 'http://localhost:3042/', redisUrl: 'redis://localhost:6391' }
];
const REDIS_DBS = { queue: 1, transporter: 2, oidc: 3 };

const APP_URL = process.env.SEMAPPS_HOME_URL;
const APP_URI = urlJoin(APP_URL, 'app');
const MAILCATCHER_URL = 'http://localhost:1081/messages';

const logger = { type: 'Console', options: { level: process.env.DEBUG_TESTS ? 'info' : 'warn', formatter: 'simple' } };

/** Retry `fn` until it doesn't throw anymore (typically an assertion on asynchronous effects) */
const waitFor = async (fn, { timeout = 30000, interval = 500 } = {}) => {
  const start = Date.now();
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (Date.now() - start > timeout) throw e;
      await delay(interval);
    }
  }
};

const listDatasets = async fusekiUrl => {
  const response = await fetch(`${fusekiUrl}$/datasets`, { headers: { Authorization: JENA_AUTH } });
  if (!response.ok) return [];
  const json = await response.json();
  return json.datasets.map(dataset => dataset['ds.name'].substring(1));
};

const sparqlUpdate = (fusekiUrl, dataset, query) =>
  fetch(`${fusekiUrl}${dataset}/update`, {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'application/sparql-update', 'X-SemappsUser': 'system', Authorization: JENA_AUTH }
  });

const flushRedisDb = async url => {
  const client = new Redis(url);
  await client.flushdb();
  client.disconnect();
};

const clearAllData = async () => {
  for (const { fusekiUrl, redisUrl } of POD_PROVIDERS) {
    for (const dataset of await listDatasets(fusekiUrl)) {
      // The settings dataset of a Pod provider also holds its special endpoints, created at startup
      await sparqlUpdate(
        fusekiUrl,
        dataset,
        dataset === 'settings'
          ? 'DELETE { ?s ?p ?o } WHERE { ?s ?p ?o . FILTER(STRSTARTS(STR(?s), "urn:")) }'
          : 'CLEAR ALL' // DROP ALL doesn't work with WebACL datasets
      );
    }
    await flushRedisDb(`${redisUrl}/${REDIS_DBS.queue}`);
    await flushRedisDb(`${redisUrl}/${REDIS_DBS.oidc}`);
  }
  await flushRedisDb(process.env.SEMAPPS_QUEUE_SERVICE_URL);
  await fetch(MAILCATCHER_URL, { method: 'DELETE' });
};

const connectPodProvider = async index => {
  const broker = new ServiceBroker({
    nodeID: `wtmp-tests-${index}`,
    logger: false,
    transporter: `${POD_PROVIDERS[index].redisUrl}/${REDIS_DBS.transporter}`
  });
  await broker.start();
  await broker.waitForServices(['ldp', 'solid-notifications.provider.webhook']);
  // The webhook channels have been deleted with the data, but they are still in memory
  await broker.call('solid-notifications.provider.webhook.resetCache');
  return broker;
};

/**
 * Start the app server with the services of the backend, as in production. Only the settings
 * which would store data outside of the triplestore or Redis are changed.
 */
const initializeAppServer = async () => {
  const config = require(path.join(BACKEND_DIR, 'moleculer.config.js'));
  const broker = new ServiceBroker({ ...config, nodeID: 'wtmp-app', logger });

  const servicesDir = path.join(BACKEND_DIR, 'services');
  const files = fs
    .readdirSync(servicesDir, { recursive: true })
    .filter(file => file.endsWith('.service.js'))
    .map(file => path.join(servicesDir, file));

  for (const file of files) {
    const schema = require(file);
    if (file.endsWith('core/core.service.js')) {
      broker.createService({ mixins: [schema], settings: { keys: { actorsKeyPairsDir: null } } });
    } else {
      broker.loadService(file);
    }
  }

  await broker.start();
  await broker.waitForServices(['app', 'importers.formats']);
  return broker;
};

/**
 * Create an account on a Pod provider and install the app on it, accepting all its access needs.
 * The returned actor has a `call` method to call actions as this user on its Pod provider.
 */
const createActor = async (podProvider, { username, name }) => {
  const { webId, token } = await podProvider.call('auth.signup', {
    username,
    email: `${username}@test.com`,
    password: 'Test1test',
    name,
    'schema:knowsLanguage': 'en'
  });

  const actor = await podProvider.call(
    'activitypub.actor.awaitCreateComplete',
    { actorUri: webId, additionalKeys: ['url', 'apods:contacts'] },
    { meta: { dataset: username } }
  );

  // The Pod provider keeps the webIds it loaded in memory, including the one of a previous run with other keys
  await podProvider.call('jsonld.document-loader.loadWithCache', { url: webId, options: { noCache: true } });

  actor.token = token;
  actor.call = (actionName, params, options = {}) =>
    podProvider.call(actionName, params, { ...options, meta: { ...options.meta, webId, dataset: username } });

  return actor;
};

const installApp = async (actor, appServer) => {
  const app = await actor.call('ldp.remote.get', { resourceUri: APP_URI });
  let requiredGroup;
  for (const groupUri of arrayOf(app['interop:hasAccessNeedGroup'])) {
    const group = await actor.call('ldp.remote.get', { resourceUri: groupUri });
    if (group['interop:accessNecessity'] === 'interop:AccessRequired') requiredGroup = group;
  }
  await actor.call('registration-endpoint.register', {
    appUri: APP_URI,
    acceptedAccessNeeds: requiredGroup['interop:hasAccessNeed'],
    acceptedSpecialRights: requiredGroup['apods:hasSpecialRights']
  });

  // Until then, what the actor does on their Pod goes unnoticed by the app
  await waitFor(async () => {
    const listeners = await appServer.call('solid-notifications.listener.getCache');
    for (const collectionUri of [actor.inbox, actor.outbox]) {
      assert.ok(listeners.some(listener => listener.resourceUri === collectionUri && listener.channelUri));
    }
  });
};

/** What the frontend does: an authenticated request to the Pod, with the user's token */
const fetchAs = async (actor, url, { method = 'GET', body, headers = {} } = {}) => {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/ld+json',
      ...(body ? { 'Content-Type': 'application/ld+json' } : {}),
      ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // Not JSON
  }
  return { status: response.status, headers: response.headers, json };
};

/**
 * Read a resource as this actor, like the frontend's `fetchWithSession`: a Pod only accepts the
 * tokens it issued, so other servers are reached through the proxy of the actor's Pod.
 */
const readAs = async (actor, url) => {
  if (!actor || new URL(url).origin === new URL(actor.id).origin) return fetchAs(actor, url);
  const formData = new FormData();
  formData.append('id', url);
  formData.append('method', 'GET');
  formData.append('headers', JSON.stringify({ accept: 'application/ld+json' }));
  const response = await fetch(actor.endpoints.proxyUrl, {
    method: 'POST',
    headers: { Accept: 'application/ld+json', Authorization: `Bearer ${actor.token}` },
    body: formData
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // Not JSON
  }
  return { status: response.status, headers: response.headers, json };
};

const getCollectionItems = async (actor, collectionUri) => {
  const { json } = await readAs(actor, collectionUri);
  if (!json) return [];
  let page = json;
  if (json.first) {
    page = typeof json.first === 'string' ? (await readAs(actor, json.first)).json : json.first;
  }
  return arrayOf(page?.orderedItems || page?.items).map(item => item.id || item);
};

const getInbox = async actor => {
  const menu = await actor.call('activitypub.collection.get', { resourceUri: actor.inbox });
  const firstPage = await actor.call('activitypub.collection.get', {
    resourceUri: actor.inbox,
    afterEq: new URL(menu.first).searchParams.get('afterEq')
  });
  return arrayOf(firstPage.orderedItems);
};

/** Notifications are sent by the app actor directly to the recipient's inbox */
const getNotifications = async actor =>
  (await getInbox(actor)).filter(
    item => arrayOf(item.type).includes('apods:Notification') && (item.actor || item.attributedTo) === APP_URI
  );

const waitForNotification = (actor, titlePattern) =>
  waitFor(async () => {
    const titles = (await getNotifications(actor)).map(notification => notification.name);
    if (!titles.some(title => titlePattern.test(title))) {
      const inbox = (await getInbox(actor)).map(a => ({ type: a.type, actor: a.actor, object: a.object }));
      assert.fail(`No notification matching ${titlePattern} in the inbox: ${JSON.stringify(inbox).slice(0, 1500)}`);
    }
  });

/** An ignored activity leaves no trace, so give it the time it would have taken to be handled */
const assertNoNotification = async (actor, titlePattern) => {
  await delay(8000);
  const titles = (await getNotifications(actor)).map(notification => notification.name);
  assert.ok(!titles.some(title => titlePattern.test(title)), `Unexpected notification matching ${titlePattern}`);
};

module.exports = {
  POD_PROVIDERS,
  APP_URL,
  APP_URI,
  waitFor,
  clearAllData,
  connectPodProvider,
  initializeAppServer,
  createActor,
  installApp,
  fetchAs,
  readAs,
  getCollectionItems,
  getInbox,
  getNotifications,
  waitForNotification,
  assertNoNotification
};
