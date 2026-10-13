const { MoleculerError } = require('moleculer').Errors;
const { ACTIVITY_TYPES, OBJECT_TYPES } = require('@semapps/activitypub');
const { PodActivitiesHandlerMixin } = require('@activitypods/app');

module.exports = {
  name: 'like',
  mixins: [PodActivitiesHandlerMixin],
  activities: {
    likeEvent: {
      match: {
        type: ACTIVITY_TYPES.LIKE,
        object: {
          type: OBJECT_TYPES.EVENT
        }
      },
      async onReceive(ctx, activity, actorUri) {
        const event = activity.object;
        const organizerUri = event['dc:creator'];

        // The status is switched by a timer, which may not have run yet: check the end date too.
        // Not a throw, like in registration.service: an exception in a handler takes the backend down.
        const isPastEnd = event.endTime && new Date(event.endTime).getTime() < Date.now();
        if (isPastEnd || (await ctx.call('status.isFinished', { event }))) {
          this.logger.warn(`Ignoring Like of ${activity.actor} on ${event.id}: the event is finished`);
          return;
        }

        // Verify the actor is invited to the event (in apods:announces)
        const announces = event['apods:announces']
          ? await ctx.call('pod-collections.getItems', {
              collectionUri: event['apods:announces'],
              actorUri
            })
          : [];

        if (!announces.includes(activity.actor)) {
          throw new MoleculerError('You must be invited to express interest', 403, 'FORBIDDEN');
        }

        // SemApps handles adding to as:likes automatically, so we just send a notification
        await ctx.call('pod-notifications.send', {
          template: {
            title: {
              en: `{{emitterProfile.vcard:given-name}} is interested in your event "{{activity.object.name}}"`,
              fr: `{{emitterProfile.vcard:given-name}} s'intéresse à votre rencontre "{{activity.object.name}}"`
            },
            actions: [
              {
                caption: {
                  en: 'View',
                  fr: 'Voir'
                },
                link: '/events/{{encodeUri activity.object.id}}'
              }
            ]
          },
          activity,
          context: event.id,
          recipientUri: actorUri
        });
      }
    },
    unlikeEvent: {
      match: {
        type: ACTIVITY_TYPES.UNDO,
        object: {
          type: ACTIVITY_TYPES.LIKE,
          object: {
            type: OBJECT_TYPES.EVENT
          }
        }
      },
      async onReceive(ctx, activity, actorUri) {
        // SemApps handles removing from as:likes automatically
        // No notification needed for un-liking
      }
    }
  }
};
