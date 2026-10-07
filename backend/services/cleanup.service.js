const urlJoin = require('url-join');
const { arrayOf, delay } = require('@semapps/ldp');
const CONFIG = require('../config/config');

module.exports = {
  name: 'cleanup',
  actions: {
    async removeAllNotifications(ctx) {
      // First delete the ACL of the notifications
      await ctx.call('triplestore.update', {
        query: `
         DELETE {
  		     GRAPH <http://semapps.org/webacl> {
              ?aclUri <http://www.w3.org/ns/auth/acl#accessTo> ?activityUri .
              ?aclUri ?p ?o .
            }
          }
          WHERE {
            ?activityUri a <http://activitypods.org/ns/core#Notification> .
            GRAPH <http://semapps.org/webacl> {
              ?aclUri <http://www.w3.org/ns/auth/acl#accessTo> ?activityUri .
              ?aclUri ?p ?o .
            }
          }
        `,
        webId: 'system'
      });

      // Then the links to the notifications
      await ctx.call('triplestore.update', {
        query: `
          DELETE {
            ?containerUri <http://www.w3.org/ns/ldp#contains> ?activityUri .
            ?collectionUri <https://www.w3.org/ns/activitystreams#items> ?activityUri .
          }
		      WHERE {
            ?activityUri a <http://activitypods.org/ns/core#Notification> .
            OPTIONAL { ?containerUri <http://www.w3.org/ns/ldp#contains> ?activityUri . }
            OPTIONAL { ?collectionUri <https://www.w3.org/ns/activitystreams#items> ?activityUri . }
          }
        `,
        webId: 'system'
      });

      // Then the notifications themselves
      await ctx.call('triplestore.update', {
        query: `
          DELETE
		      WHERE {
            ?activityUri a <http://activitypods.org/ns/core#Notification> .
            ?activityUri ?p ?o .
          }
        `,
        webId: 'system'
      });

      // Then the orphan blank nodes
      await ctx.call('triplestore.update', {
        query: `
          DELETE {
            ?s ?p ?o .
          }
          WHERE {
            ?s ?p ?o .
            FILTER(isBLANK(?s))
            FILTER(NOT EXISTS {?parentS ?parentP ?s})
          }
        `,
        webId: 'system'
      });
    },
    async removeOldNotifications(ctx) {
      const limitDate = new Date();
      limitDate.setMonth(limitDate.getMonth() - 3);

      const activitiesUris = await ctx.call('ldp.container.getUris', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'as/activity')
      });

      for (const activityUri of activitiesUris) {
        const activity = await ctx.call('activitypub.activity.get', { resourceUri: activityUri, webId: 'system' });

        const activityDate = new Date(activity['dc:created']);
        const appOutbox = urlJoin(CONFIG.HOME_URL, 'app/outbox');

        if (arrayOf(activity.type).includes('apods:Notification') && activityDate < limitDate) {
          this.logger.info(`Deleting notification ${activity.name}...`);

          await ctx.call('ldp.resource.delete', { resourceUri: activityUri, webId: 'system' });

          await ctx.call('triplestore.update', {
            query: `
              DELETE
              WHERE {
                <${appOutbox}> <https://www.w3.org/ns/activitystreams#items> <${activityUri}>
              }
            `,
            webId: 'system'
          });
        }
      }
    },
    async removeOldEvents(ctx) {
      const actorsUris = ctx.params.actorUri
        ? [ctx.params.actorUri]
        : await ctx.call('app-registrations.getRegisteredPods');

      const limitDate = new Date();
      limitDate.setMonth(limitDate.getMonth() - 18);

      for (const actorUri of actorsUris) {
        this.logger.info(`Cleaning up events of ${actorUri}...`);

        try {
          const { body: eventsContainer } = await ctx.call('events.list', { actorUri });

          for (const event of arrayOf(eventsContainer?.['ldp:contains'])) {
            const endTimeDate = new Date(event.endTime);
            if (endTimeDate < limitDate && event['dc:creator'] === actorUri) {
              this.logger.info(`Event ${event.name} finished more than 18 months ago (${endTimeDate}), deleting...`);

              await ctx.call('events.delete', { resourceUri: event.id || event['@id'], actorUri });

              // Wait 1min, to ensure all users have deleted their cache
              await delay(180000);
            }
          }
        } catch (e) {
          this.logger.warn(`Could not delete old events of actor ${actorUri}. Error: ${e.message}`);
        }
      }
    },
    async markPastEventsAsFinished(ctx) {
      const actorsUris = ctx.params.actorUri
        ? [ctx.params.actorUri]
        : await ctx.call('app-registrations.getRegisteredPods');

      for (const actorUri of actorsUris) {
        this.logger.info(`Looking for events of ${actorUri}...`);

        const { body: eventsContainer } = await ctx.call('events.list', { actorUri });

        for (const event of arrayOf(eventsContainer?.['ldp:contains'])) {
          const hasFinishedStatus = await ctx.call('status.isFinished', { event });
          if (!hasFinishedStatus && this.isPastDate(event.endTime) && event['dc:creator'] === actorUri) {
            this.logger.info(`Marking event ${event.name} as finished`);
            await ctx.call('status.tagAsFinished', { event, actorUri });
          }
        }
      }
    }
  },
  methods: {
    isPastDate(date) {
      const diff = new Date().getTime() - new Date(date).getTime();
      return diff > 0;
    }
  }
};
