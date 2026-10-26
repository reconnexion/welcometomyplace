const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { delay } = require('@semapps/ldp');
const {
  waitFor,
  fetchAs,
  readAs,
  getCollectionItems,
  waitForNotification,
  assertNoNotification,
  getNotifications
} = require('./initialize');
const { issueEventLink, fetchWithCapability } = require('./capability');
const { MODES, STATUS, setUp, createLocation, createEvent, getEvent, waitForStatus, postActivity, inSeconds } = require('./utils');

for (const mode of MODES) {
  describe(`Invitations and registrations (${mode})`, () => {
    let appServer, tearDown, alice, bob, craig, daisy, eventUri, locationUri, event, link;

    // The organizer is on the first Pod provider, the guests on the second one in multi-server mode
    before(async () => {
      ({
        appServer,
        actors: { alice, bob, craig, daisy },
        tearDown
      } = await setUp(mode, {
        alice: { name: 'Alice' },
        bob: { name: 'Bob', server: 1 },
        craig: { name: 'Craig', server: 1 },
        daisy: { name: 'Daisy', server: 1 }
      }));

      locationUri = await createLocation(appServer, alice, "Alice's place");
      eventUri = await createEvent(appServer, alice, {
        name: 'Birthday party',
        startTime: inSeconds(3600),
        endTime: inSeconds(7200),
        location: locationUri,
        'apods:maxAttendees': 3
      });
      await waitForStatus(alice, eventUri, [STATUS.open, STATUS.coming]);
      await waitFor(async () => {
        event = await getEvent(alice, eventUri);
        assert.ok(event['apods:attendees']);
      });
    });

    after(async () => {
      await tearDown?.();
    });

    const getAttendees = () => getCollectionItems(alice, event['apods:attendees']);

    const join = (actor, extra = {}) => postActivity(actor, { type: 'Join', object: eventUri, to: alice.id, ...extra });

    /** An ignored activity leaves no trace, so give it the time it would have taken to be handled */
    const assertNotAttending = async actor => {
      await delay(8000);
      assert.ok(!(await getAttendees()).includes(actor.id));
    };

    test('Uninvited people cannot see the event', async () => {
      assert.equal((await fetchAs(undefined, eventUri)).status, 403);
      assert.equal((await readAs(daisy, eventUri)).status, 403);
    });

    test('An invited guest is notified and can see the event and its location', async () => {
      await postActivity(alice, { type: 'Announce', object: eventUri, to: bob.id });

      await waitForNotification(bob, /invites you to an event "Birthday party"/);

      await waitFor(async () => {
        assert.equal((await readAs(bob, eventUri)).status, 200);
        assert.equal((await readAs(bob, locationUri)).status, 200);
      });

      event = await getEvent(alice, eventUri);
      assert.deepEqual(await getCollectionItems(alice, event['apods:announces']), [bob.id]);
    });

    test('The organizer is notified when a guest is interested', async () => {
      await postActivity(bob, { type: 'Like', object: eventUri, to: alice.id });
      await waitForNotification(alice, /is interested in your event "Birthday party"/);
    });

    test('A Like from someone who was not invited is ignored', async () => {
      await postActivity(daisy, { type: 'Like', object: eventUri, to: alice.id });
      await assertNoNotification(alice, /Daisy is interested/);
    });

    test('A Join from someone who was not invited is ignored', async () => {
      await join(daisy);
      await assertNotAttending(daisy);
    });

    test('A guest can join the event', async () => {
      await join(bob);

      await waitFor(async () => {
        assert.deepEqual((await getAttendees()).sort(), [alice.id, bob.id].sort());
      });
      await waitForNotification(alice, /Bob is attending your event "Birthday party"/);
    });

    test('The organizer can see the profile of the guests who joined', async () => {
      await waitFor(async () => {
        assert.equal((await readAs(alice, bob.url)).status, 200);
      });
    });

    test('Anyone with the public link can see the event without an account', async () => {
      link = await issueEventLink(alice, eventUri, [eventUri, locationUri, alice.url]);

      for (const uri of [eventUri, locationUri, alice.url]) {
        assert.equal((await fetchWithCapability(uri, link)).status, 200, uri);
      }
    });

    test('A Join pointing to a credential that is not the link of this event is ignored', async () => {
      await join(daisy, { instrument: `${alice.id}/data/not-a-credential` });
      await assertNotAttending(daisy);
    });

    test('Someone who was not invited can join with the public link', async () => {
      await join(craig, { instrument: link.id });

      await waitFor(async () => {
        assert.ok((await getAttendees()).includes(craig.id));
      });

      // The organizer announces the event to them, so that they keep seeing it like a guest...
      await waitFor(async () => {
        assert.equal((await readAs(craig, eventUri)).status, 200);
      });

      // ...but without telling them they were invited
      const notifications = await getNotifications(craig);
      assert.ok(!notifications.some(n => /invites you/.test(n.name)));
    });

    test('The event is closed once the maximum number of attendees is reached', async () => {
      await waitForStatus(alice, eventUri, [STATUS.closed]);

      await join(daisy, { instrument: link.id });
      await assertNotAttending(daisy);
    });

    test('An attendee can leave, which reopens the event', async () => {
      await postActivity(bob, { type: 'Leave', object: eventUri, to: alice.id });

      await waitFor(async () => {
        assert.ok(!(await getAttendees()).includes(bob.id));
      });
      await waitForStatus(alice, eventUri, [STATUS.open]);
      await waitForNotification(alice, /is not attending anymore your event "Birthday party"/);
    });

    test('A revoked public link cannot be used anymore', async () => {
      assert.ok([200, 204].includes((await fetchAs(alice, link.id, { method: 'DELETE' })).status));

      assert.notEqual((await fetchWithCapability(eventUri, link)).status, 200);

      await join(daisy, { instrument: link.id });
      await assertNotAttending(daisy);
    });
  });
}
