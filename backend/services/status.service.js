const { arrayOf } = require('@semapps/ldp');
const { triple, namedNode } = require('@rdfjs/data-model');

const STATUS_COMING = 'http://activitypods.org/ns/core#Coming';
const STATUS_FINISHED = 'http://activitypods.org/ns/core#Finished';
const STATUS_OPEN = 'http://activitypods.org/ns/core#Open';
const STATUS_CLOSED = 'http://activitypods.org/ns/core#Closed';

module.exports = {
  name: 'status',
  actions: {
    async set(ctx) {
      const { event, statusToAdd, statusToRemove, actorUri } = ctx.params;

      await ctx.call('events.patch', {
        resourceUri: event.id || event['@id'],
        triplesToAdd: [
          triple(
            namedNode(event.id || event['@id']),
            namedNode('http://activitypods.org/ns/core#hasStatus'),
            namedNode(statusToAdd)
          )
        ],
        triplesToRemove: [
          triple(
            namedNode(event.id || event['@id']),
            namedNode('http://activitypods.org/ns/core#hasStatus'),
            namedNode(statusToRemove)
          )
        ],
        actorUri
      });
    },
    async tagAsOpen(ctx) {
      const { event, actorUri } = ctx.params;
      await this.actions.set({
        event,
        statusToAdd: STATUS_OPEN,
        statusToRemove: STATUS_CLOSED,
        actorUri
      });
    },
    async tagAsClosed(ctx) {
      const { event, actorUri } = ctx.params;
      await this.actions.set({
        event,
        statusToAdd: STATUS_CLOSED,
        statusToRemove: STATUS_OPEN,
        actorUri
      });
    },
    async tagAsComing(ctx) {
      const { event, actorUri } = ctx.params;
      await this.actions.set({
        event,
        statusToAdd: STATUS_COMING,
        statusToRemove: STATUS_FINISHED,
        actorUri
      });
    },
    async tagAsFinished(ctx) {
      const { event, actorUri } = ctx.params;
      await this.actions.set({
        event,
        statusToAdd: STATUS_FINISHED,
        statusToRemove: STATUS_COMING,
        actorUri
      });
      ctx.emit('event.finished', { eventUri: event.id, actorUri });
    },
    async tagNewEvent(ctx) {
      const { event, actorUri } = ctx.params;

      await this.actions.tagAsOpen({ event, actorUri });
      await this.actions.tagAsComing({ event, actorUri });

      if (event['apods:closingTime']) {
        await ctx.call('timer.set', {
          key: [event.id, 'closed'],
          time: event['apods:closingTime'],
          actionName: 'status.tagAsClosed',
          params: { event, actorUri }
        });
      }

      await ctx.call('timer.set', {
        key: [event.id, 'finished'],
        time: event.endTime,
        actionName: 'status.tagAsFinished',
        params: { event, actorUri }
      });
    },
    async tagUpdatedEvent(ctx) {
      let { event, eventUri, actorUri } = ctx.params;
      let maxAttendeesReached = false;
      let closingTimeReached = false;

      if (!event) {
        if (!eventUri) throw new Error(`If no event param is passed, the eventUri param is required`);
        ({ body: event } = await ctx.call('pod-resources.get', {
          resourceUri: eventUri,
          actorUri
        }));
      }

      const isClosed = await this.actions.isClosed({ event }, { parentCtx: ctx });
      const isFinished = await this.actions.isFinished({ event }, { parentCtx: ctx });

      // Reset timer in case the end time was changed
      if (!this.isPastDate(event.endTime)) {
        if (isFinished) await this.actions.tagAsComing({ event, actorUri });
        await ctx.call('timer.set', {
          key: [event.id, 'finished'],
          time: event.endTime,
          actionName: 'status.tagAsFinished',
          params: { event, actorUri }
        });
      }

      if (event['apods:closingTime']) {
        closingTimeReached = this.isPastDate(event['apods:closingTime']);
      } else {
        await ctx.call('timer.delete', { key: [event.id, 'closed'] });
      }

      if (event['apods:maxAttendees']) {
        const attendeesCollectionUri = await ctx.call('attendees.getCollectionUriFromResource', {
          resource: event,
          actorUri
        });

        if (attendeesCollectionUri) {
          const { body: attendeesCollection } = await ctx.call('pod-resources.get', {
            resourceUri: attendeesCollectionUri,
            actorUri
          });

          maxAttendeesReached = arrayOf(attendeesCollection.items).length >= event['apods:maxAttendees'];
        }
      }

      if (maxAttendeesReached || closingTimeReached) {
        if (!isClosed) await this.actions.tagAsClosed({ event, actorUri });
      } else {
        if (isClosed) await this.actions.tagAsOpen({ event, actorUri });
        if (event['apods:closingTime'] && !closingTimeReached) {
          await ctx.call('timer.set', {
            key: [event.id, 'closed'],
            time: event['apods:closingTime'],
            actionName: 'status.tagAsClosed',
            params: { event, actorUri }
          });
        }
      }
    },
    isFinished(ctx) {
      const { event } = ctx.params;
      const status = arrayOf(event['apods:hasStatus']);
      return status.includes('apods:Finished') || status.includes(STATUS_FINISHED);
    },
    isClosed(ctx) {
      const { event } = ctx.params;
      const status = arrayOf(event['apods:hasStatus']);
      return status.includes('apods:Closed') || status.includes(STATUS_CLOSED);
    }
  },
  methods: {
    isPastDate(date) {
      const diff = new Date().getTime() - new Date(date).getTime();
      return diff > 0;
    }
  }
};
