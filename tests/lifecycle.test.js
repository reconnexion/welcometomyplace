const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { arrayOf } = require('@semapps/ldp');
const { waitFor, getCollectionItems, getInbox, waitForNotification, assertNoNotification } = require('./initialize');
const {
  MODES,
  STATUS,
  setUp,
  createLocation,
  createEvent,
  updateEvent,
  getEvent,
  waitForStatus,
  postActivity,
  inSeconds
} = require('./utils');

for (const mode of MODES) {
  describe(`Events lifecycle (${mode})`, () => {
    let appServer, tearDown, alice, bob, craig, locationUri;

    before(async () => {
      ({
        appServer,
        actors: { alice, bob, craig },
        tearDown
      } = await setUp(mode, {
        alice: { name: 'Alice' },
        bob: { name: 'Bob', server: 1 },
        craig: { name: 'Craig', server: 1 }
      }));
      locationUri = await createLocation(appServer, alice, "Alice's place");
    });

    after(async () => {
      await tearDown?.();
    });

    const getTimer = (eventUri, name) => appServer.call('timer.get', { key: [eventUri, name] });

    const getOffers = async (actor, eventUri) =>
      (await getInbox(actor)).filter(activity => arrayOf(activity.type).includes('Offer') && activity.context === eventUri);

    describe('An event with a closing time and an end time', () => {
      let eventUri;

      before(async () => {
        eventUri = await createEvent(appServer, alice, {
          name: 'Picnic',
          startTime: inSeconds(25),
          endTime: inSeconds(45),
          'apods:closingTime': inSeconds(25),
          location: locationUri
        });
        await waitForStatus(alice, eventUri, [STATUS.open, STATUS.coming]);
      });

      test('Timers are set to close and finish it', async () => {
        assert.equal((await getTimer(eventUri, 'closed')).actionName, 'status.tagAsClosed');
        assert.equal((await getTimer(eventUri, 'finished')).actionName, 'status.tagAsFinished');
      });

      test('A guest joins before the closing time', async () => {
        await postActivity(alice, { type: 'Announce', object: eventUri, to: [bob.id, craig.id] });
        await waitForNotification(bob, /invites you to an event "Picnic"/);
        await postActivity(bob, { type: 'Join', object: eventUri, to: alice.id });
        await waitFor(async () => {
          const event = await getEvent(alice, eventUri);
          assert.ok((await getCollectionItems(alice, event['apods:attendees'])).includes(bob.id));
        });
      });

      test('It is closed at the closing time', async () => {
        await waitForStatus(alice, eventUri, [STATUS.closed, STATUS.coming]);
      });

      test('Nobody can join once it is closed', async () => {
        await postActivity(craig, { type: 'Join', object: eventUri, to: alice.id });
        await assertNoNotification(alice, /Craig is attending/);
      });

      test('Guests cannot say they are interested once it has started', async () => {
        await postActivity(craig, { type: 'Like', object: eventUri, to: alice.id });
        await assertNoNotification(alice, /Craig is interested/);
      });

      test('It is finished at the end time', async () => {
        await waitForStatus(alice, eventUri, [STATUS.finished], { timeout: 60000 });
        assert.equal(await getTimer(eventUri, 'finished'), false);
      });

      test('Attendees who are not contacts yet are offered to add each other', async () => {
        await waitFor(async () => {
          const [offerToBob] = await getOffers(bob, eventUri);
          assert.equal(offerToBob?.actor, alice.id);
          assert.equal(offerToBob.object.object, alice.url);

          const [offerToAlice] = await getOffers(alice, eventUri);
          assert.equal(offerToAlice?.actor, bob.id);
          assert.equal(offerToAlice.object.object, bob.url);
        });
        // Craig never attended
        assert.equal((await getOffers(craig, eventUri)).length, 0);
      });

      test('Rescheduling the timers fixes the status of a finished event', async () => {
        await appServer.call('status.tagAsComing', { event: { id: eventUri }, actorUri: alice.id });
        await waitForStatus(alice, eventUri, [STATUS.coming]);

        const stats = await appServer.call('status.rescheduleAll', { actorUri: alice.id, notifyWithinDays: 0 });
        assert.equal(stats.taggedAsFinished, 1);
        await waitForStatus(alice, eventUri, [STATUS.finished]);
      });

      test('Past events which are not tagged as finished can be marked as such', async () => {
        await appServer.call('status.tagAsComing', { event: { id: eventUri }, actorUri: alice.id });
        await waitForStatus(alice, eventUri, [STATUS.coming]);

        await appServer.call('cleanup.markPastEventsAsFinished', { actorUri: alice.id });
        await waitForStatus(alice, eventUri, [STATUS.finished]);
      });

      test('Postponing it makes it coming again', async () => {
        await updateEvent(alice, eventUri, {
          startTime: inSeconds(3600),
          endTime: inSeconds(7200),
          'apods:closingTime': undefined
        });
        await waitForStatus(alice, eventUri, [STATUS.open, STATUS.coming]);
        assert.equal((await getTimer(eventUri, 'finished')).actionName, 'status.tagAsFinished');
        assert.equal(await getTimer(eventUri, 'closed'), false);
      });
    });

    describe('Updating an event', () => {
      let eventUri;

      before(async () => {
        eventUri = await createEvent(appServer, alice, {
          name: 'Concert',
          startTime: inSeconds(3600),
          endTime: inSeconds(7200),
          location: locationUri
        });
        await waitForStatus(alice, eventUri, [STATUS.open, STATUS.coming]);
        await waitFor(async () => assert.ok((await getEvent(alice, eventUri))['apods:attendees']));
      });

      test('A closing time in the past closes it', async () => {
        await updateEvent(alice, eventUri, { 'apods:closingTime': inSeconds(-60) });
        await waitForStatus(alice, eventUri, [STATUS.closed]);
      });

      test('Removing the closing time reopens it', async () => {
        await updateEvent(alice, eventUri, { 'apods:closingTime': undefined });
        await waitForStatus(alice, eventUri, [STATUS.open]);
      });

      test('A future closing time keeps it open until then', async () => {
        await updateEvent(alice, eventUri, { 'apods:closingTime': inSeconds(1800) });
        await waitFor(async () => {
          assert.equal((await getTimer(eventUri, 'closed'))?.actionName, 'status.tagAsClosed');
        });
        await waitForStatus(alice, eventUri, [STATUS.open]);
      });

      test('Lowering the maximum number of attendees to the current number closes it', async () => {
        // The organizer is the only attendee
        await updateEvent(alice, eventUri, { 'apods:maxAttendees': 1 });
        await waitForStatus(alice, eventUri, [STATUS.closed]);
      });

      test('Raising it reopens it', async () => {
        await updateEvent(alice, eventUri, { 'apods:maxAttendees': 10 });
        await waitForStatus(alice, eventUri, [STATUS.open]);
      });

      test('Rescheduling keeps the existing timers and restores the missing ones', async () => {
        await appServer.call('timer.delete', { key: [eventUri, 'finished'] });

        const stats = await appServer.call('status.rescheduleAll', { actorUri: alice.id });
        assert.equal(stats.timersSet, 1);
        assert.ok(stats.timersKept >= 1);
        assert.equal(stats.eventsFailed, 0);
        assert.equal((await getTimer(eventUri, 'finished')).actionName, 'status.tagAsFinished');
      });

      test('Recent events are not removed by the cleanup', async () => {
        await appServer.call('cleanup.removeOldEvents', { actorUri: alice.id });
        assert.equal((await getEvent(alice, eventUri)).name, 'Concert');
      });
    });
  });
}
