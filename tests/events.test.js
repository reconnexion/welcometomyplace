const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { waitFor, getCollectionItems } = require('./initialize');
const { MODES, STATUS, setUp, createLocation, createEvent, getEvent, waitForStatus, inSeconds } = require('./utils');

for (const mode of MODES) {
  describe(`Events (${mode})`, () => {
    let appServer, alice, tearDown, eventUri, locationUri;

    before(async () => {
      ({ appServer, actors: { alice }, tearDown } = await setUp(mode, { alice: { name: 'Alice' } }));
    });

    after(async () => {
      await tearDown?.();
    });

    test('A new event is open, coming, and its organizer attends it', async () => {
      locationUri = await createLocation(appServer, alice, "Alice's place");

      eventUri = await createEvent(appServer, alice, {
        name: 'Birthday party',
        startTime: inSeconds(3600),
        endTime: inSeconds(7200),
        location: locationUri
      });

      await waitForStatus(alice, eventUri, [STATUS.open, STATUS.coming]);

      await waitFor(async () => {
        const event = await getEvent(alice, eventUri);
        assert.ok(event['apods:attendees']);
        assert.deepEqual(await getCollectionItems(alice, event['apods:attendees']), [alice.id]);
      });
    });
  });
}
