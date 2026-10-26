const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const urlJoin = require('url-join');
const { arrayOf } = require('@semapps/ldp');
const { APP_URL, APP_URI, waitFor, fetchAs, waitForNotification, getNotifications } = require('./initialize');
const { setUp, createEvent, postActivity, inSeconds } = require('./utils');

// Nothing here depends on where the Pods are
describe('App server', () => {
  let appServer, tearDown, alice, bob;

  before(async () => {
    ({
      appServer,
      actors: { alice, bob },
      tearDown
    } = await setUp('single-server', { alice: { name: 'Alice' }, bob: { name: 'Bob' } }));
  });

  after(async () => {
    await tearDown?.();
  });

  const countNotifications = async () => {
    const [{ count }] = await appServer.call('triplestore.query', {
      query: `
        SELECT (COUNT(?s) AS ?count)
        WHERE { ?s a <http://activitypods.org/ns/core#Notification> }
      `,
      webId: 'system'
    });
    return Number(count.value);
  };

  test('The app actor describes its access needs', async () => {
    const { status, json: app } = await fetchAs(undefined, APP_URI);
    assert.equal(status, 200);
    assert.ok(arrayOf(app.type).includes('interop:Application'));
    assert.ok(app['interop:hasAccessNeedGroup']);
  });

  test('The event formats are imported and public', async () => {
    const { status, json } = await fetchAs(undefined, urlJoin(APP_URL, 'apods/event-format'));
    assert.equal(status, 200);
    const formats = arrayOf(json['ldp:contains']);
    assert.ok(formats.length > 0);
    assert.ok(formats.every(format => arrayOf(format.type).includes('apods:EventFormat')));
  });

  test('The helpers and files containers are public', async () => {
    for (const service of ['helpers', 'files']) {
      const containerUri = await appServer.call(`${service}.getContainerUri`);
      assert.equal((await fetchAs(undefined, containerUri)).status, 200, service);
      assert.notEqual(
        (await fetchAs(undefined, containerUri, { method: 'POST', body: { type: 'apods:Helper' } })).status,
        201,
        service
      );
    }
  });

  test('Nodeinfo counts the Pods which installed the app', async () => {
    const { json: links } = await fetchAs(undefined, urlJoin(APP_URL, '.well-known/nodeinfo'));
    // The registrations reach the app server asynchronously
    await waitFor(async () => {
      const { json: nodeinfo } = await fetchAs(undefined, links.links[0].href);
      assert.equal(nodeinfo.usage.users.total, 2);
    });
  });

  test('Notifications can all be removed from the app server', async () => {
    const eventUri = await createEvent(appServer, alice, {
      name: 'Birthday party',
      startTime: inSeconds(3600),
      endTime: inSeconds(7200)
    });
    await postActivity(alice, { type: 'Announce', object: eventUri, to: bob.id });
    await waitForNotification(bob, /invites you/);
    assert.ok((await countNotifications()) > 0);

    await appServer.call('cleanup.removeAllNotifications');
    assert.equal(await countNotifications(), 0);

    // The copies in the inboxes are not affected
    assert.equal((await getNotifications(bob)).length, 1);
  });
});
