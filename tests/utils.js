const assert = require('node:assert/strict');
const urlJoin = require('url-join');
const { arrayOf } = require('@semapps/ldp');
const {
  APP_URL,
  waitFor,
  clearAllData,
  connectPodProvider,
  initializeAppServer,
  createActor,
  installApp,
  fetchAs
} = require('./initialize');

const JSON_CONTEXT = ['https://www.w3.org/ns/activitystreams', urlJoin(APP_URL, '.well-known/context.jsonld')];

const STATUS = {
  open: 'apods:Open',
  closed: 'apods:Closed',
  coming: 'apods:Coming',
  finished: 'apods:Finished'
};

/**
 * Start the app server and create the given users, each on the Pod provider of their index (0 or
 * 1). In single-server mode, everybody is on the first one.
 */
const log = (...args) => process.env.DEBUG_TESTS && console.log(new Date().toISOString(), ...args);

/** Modes to run, e.g. `MODES=multi-server` to debug a single one */
const MODES = process.env.MODES ? process.env.MODES.split(',') : ['single-server', 'multi-server'];

const setUp = async (mode, users) => {
  log('Clearing data...');
  await clearAllData();

  const podProviders = [await connectPodProvider(0)];
  if (mode === 'multi-server') podProviders.push(await connectPodProvider(1));

  log('Starting the app server...');
  const appServer = await initializeAppServer();

  const actors = {};
  for (const [username, { name, server = 0 }] of Object.entries(users)) {
    const podProvider = podProviders[mode === 'multi-server' ? server : 0];
    log(`Creating ${username}...`);
    actors[username] = await createActor(podProvider, { username, name });
    log(`Installing the app for ${username}...`);
    await installApp(actors[username], appServer);
  }

  const tearDown = async () => {
    await appServer.stop();
    for (const podProvider of podProviders) await podProvider.stop();
  };

  return { appServer, podProviders, actors, tearDown };
};

/** The access grants reach the app server asynchronously after the installation */
const getContainerUri = (appServer, actor, shapeTree) =>
  waitFor(async () => {
    const containerUri = await appServer.call('access-grants.getContainerByShapeTree', {
      shapeTreeUri: urlJoin(process.env.SEMAPPS_SHAPE_REPOSITORY_URL, 'shapetrees', shapeTree),
      podOwner: actor.id
    });
    assert.ok(containerUri, `No ${shapeTree} container for ${actor.id}`);
    return containerUri;
  });

const createLocation = async (appServer, actor, name) => {
  const containerUri = await getContainerUri(appServer, actor, 'vcard/Location');
  const { status, headers } = await fetchAs(actor, containerUri, {
    method: 'POST',
    body: { '@context': JSON_CONTEXT, type: 'vcard:Location', 'vcard:given-name': name }
  });
  assert.equal(status, 201);
  return headers.get('Location');
};

/** Create an event like the frontend does, with a POST on the Pod's events container */
const createEvent = async (appServer, actor, event) => {
  const containerUri = await getContainerUri(appServer, actor, 'as/Event');
  const { status, headers } = await fetchAs(actor, containerUri, {
    method: 'POST',
    body: { '@context': JSON_CONTEXT, type: 'Event', ...event }
  });
  assert.equal(status, 201);
  return headers.get('Location');
};

/** Like the frontend's data provider: read the event, then PUT it back with the changes */
const updateEvent = async (actor, eventUri, changes) => {
  const { json: current } = await fetchAs(actor, eventUri);
  const { '@context': currentContext, ...rest } = current;
  const { status } = await fetchAs(actor, eventUri, {
    method: 'PUT',
    body: { '@context': [...JSON_CONTEXT, ...arrayOf(currentContext)], ...rest, ...changes }
  });
  assert.equal(status, 204);
};

const getEvent = async (actor, eventUri) => (await fetchAs(actor, eventUri)).json;

const waitForStatus = (actor, eventUri, statuses, options) =>
  waitFor(async () => {
    const event = await getEvent(actor, eventUri);
    const current = arrayOf(event?.['apods:hasStatus']);
    assert.ok(
      statuses.every(status => current.includes(status)),
      `Expected ${statuses} but got ${current}`
    );
  }, options);

const postActivity = (actor, activity) =>
  actor.call('activitypub.outbox.post', { collectionUri: actor.outbox, actor: actor.id, ...activity });

const inSeconds = seconds => new Date(Date.now() + seconds * 1000).toISOString();

module.exports = {
  JSON_CONTEXT,
  STATUS,
  MODES,
  setUp,
  createLocation,
  createEvent,
  updateEvent,
  getEvent,
  waitForStatus,
  postActivity,
  inSeconds
};
