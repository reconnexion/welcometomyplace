const { arrayOf, delay } = require('@semapps/ldp');
const rdf = require('@rdfjs/data-model').default;
const CONFIG = require('../config/config');

const STATUS_COMING = 'http://activitypods.org/ns/core#Coming';
const STATUS_FINISHED = 'http://activitypods.org/ns/core#Finished';
const STATUS_OPEN = 'http://activitypods.org/ns/core#Open';
const STATUS_CLOSED = 'http://activitypods.org/ns/core#Closed';

// Wait a bit after startup before rescheduling the timers, so that the app is fully ready
// (app actor created, access needs registered, Pods reachable)
const RESCHEDULE_ON_START_DELAY = 60 * 1000;

module.exports = {
  name: 'status',
  async started() {
    if (!CONFIG.RESCHEDULE_TIMERS_ON_START) return;
    // Don't block the startup of the broker
    (async () => {
      try {
        await this.broker.waitForServices(['app', 'app-registrations', 'events', 'pod-resources', 'timer']);
        await delay(RESCHEDULE_ON_START_DELAY);
        await this.broker.call('status.rescheduleAll');
      } catch (e) {
        this.logger.error(`Could not reschedule the events timers on startup: ${e.message}`);
      }
    })();
  },
  actions: {
    async set(ctx) {
      const { event, statusToAdd, statusToRemove, actorUri } = ctx.params;

      await ctx.call('events.patch', {
        resourceUri: event.id || event['@id'],
        triplesToAdd: [
          rdf.quad(
            rdf.namedNode(event.id || event['@id']),
            rdf.namedNode('http://activitypods.org/ns/core#hasStatus'),
            rdf.namedNode(statusToAdd)
          )
        ],
        triplesToRemove: [
          rdf.quad(
            rdf.namedNode(event.id || event['@id']),
            rdf.namedNode('http://activitypods.org/ns/core#hasStatus'),
            rdf.namedNode(statusToRemove)
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
    /**
     * Reschedule the status timers of all the events managed by the app, and fix the statuses that
     * should already have changed. Timers are delayed Bull jobs in the app's Redis, so they are lost
     * if the Redis is reset (e.g. on a migration). Idempotent: an existing timer with the same key
     * and time is kept, otherwise it is replaced (`timer.set` removes any job with the same key).
     *
     * Params (all optional):
     * - actorUri: only handle the events of this Pod
     * - dryRun: only log what would be done
     * - notifyWithinDays: events which ended less than this number of days ago are tagged as
     *   finished with `tagAsFinished`, which emits `event.finished` (contact suggestions to the
     *   attendees). Older ones are only fixed silently. Default: 3.
     */
    async rescheduleAll(ctx) {
      const { actorUri: onlyActorUri, dryRun = false, notifyWithinDays = 3 } = ctx.params;

      if (this.rescheduling) {
        this.logger.warn('Events timers are already being rescheduled, skipping...');
        return;
      }
      this.rescheduling = true;

      const stats = {
        pods: 0,
        podsFailed: 0,
        events: 0,
        eventsFailed: 0,
        timersKept: 0,
        timersSet: 0,
        taggedAsFinished: 0,
        taggedAsClosed: 0
      };

      try {
        const actorsUris = onlyActorUri
          ? [onlyActorUri]
          : arrayOf(await ctx.call('app-registrations.getRegisteredPods'));

        this.logger.info(
          `Rescheduling the events timers of ${actorsUris.length} Pod(s)${dryRun ? ' (dry run)' : ''}...`
        );

        for (const actorUri of actorsUris) {
          let events;
          try {
            const { body: eventsContainer } = await ctx.call('events.list', { actorUri });
            // Only handle the events created by the Pod owner. Copies of shared events are attached
            // to the same container, but they are updated by their organizer's Pod.
            events = arrayOf(eventsContainer?.['ldp:contains']).filter(event => event['dc:creator'] === actorUri);
            stats.pods++;
          } catch (e) {
            stats.podsFailed++;
            this.logger.warn(`Could not list the events of ${actorUri}: ${e.message}`);
            continue;
          }

          for (const event of events) {
            stats.events++;
            try {
              await this.rescheduleEvent(ctx, event, actorUri, { dryRun, notifyWithinDays, stats });
            } catch (e) {
              stats.eventsFailed++;
              this.logger.warn(`Could not reschedule the timers of event ${event.id || event['@id']}: ${e.message}`);
            }
          }
        }
      } finally {
        this.rescheduling = false;
      }

      this.logger.info(`Events timers rescheduled${dryRun ? ' (dry run)' : ''}: ${JSON.stringify(stats)}`);

      return stats;
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
    async rescheduleEvent(ctx, event, actorUri, { dryRun, notifyWithinDays, stats }) {
      event = { ...event, id: event.id || event['@id'] };

      // Coming -> Finished
      if (event.endTime && !(await this.actions.isFinished({ event }, { parentCtx: ctx }))) {
        if (this.isPastDate(event.endTime)) {
          const notify = new Date().getTime() - new Date(event.endTime).getTime() < notifyWithinDays * 86400000;
          this.logger.info(`Event ${event.id} ended on ${event.endTime}, tagging it as finished...`);
          if (!dryRun) {
            // Remove any pending timer (e.g. a copied Redis) so that the event is not tagged twice
            await ctx.call('timer.delete', { key: [event.id, 'finished'] });
            if (notify) {
              await this.actions.tagAsFinished({ event, actorUri }, { parentCtx: ctx });
            } else {
              await this.actions.set(
                { event, statusToAdd: STATUS_FINISHED, statusToRemove: STATUS_COMING, actorUri },
                { parentCtx: ctx }
              );
            }
          }
          stats.taggedAsFinished++;
        } else {
          await this.ensureTimer(ctx, [event.id, 'finished'], event.endTime, 'status.tagAsFinished', {
            event,
            actorUri,
            dryRun,
            stats
          });
        }
      }

      // Open -> Closed
      if (event['apods:closingTime'] && !(await this.actions.isClosed({ event }, { parentCtx: ctx }))) {
        if (this.isPastDate(event['apods:closingTime'])) {
          this.logger.info(`Event ${event.id} closed on ${event['apods:closingTime']}, tagging it as closed...`);
          if (!dryRun) {
            await ctx.call('timer.delete', { key: [event.id, 'closed'] });
            await this.actions.tagAsClosed({ event, actorUri }, { parentCtx: ctx });
          }
          stats.taggedAsClosed++;
        } else {
          await this.ensureTimer(ctx, [event.id, 'closed'], event['apods:closingTime'], 'status.tagAsClosed', {
            event,
            actorUri,
            dryRun,
            stats
          });
        }
      }
    },
    async ensureTimer(ctx, key, time, actionName, { event, actorUri, dryRun, stats }) {
      const existingTimer = await ctx.call('timer.get', { key });
      if (
        existingTimer &&
        existingTimer.actionName === actionName &&
        new Date(existingTimer.time).getTime() === new Date(time).getTime()
      ) {
        stats.timersKept++;
        return;
      }
      this.logger.info(`Setting timer ${key.join('|')} at ${time}...`);
      if (!dryRun) {
        await ctx.call('timer.set', { key, time, actionName, params: { event, actorUri } });
      }
      stats.timersSet++;
    },
    isPastDate(date) {
      const diff = new Date().getTime() - new Date(date).getTime();
      return diff > 0;
    }
  }
};
