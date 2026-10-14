const { ACTIVITY_TYPES } = require('@semapps/activitypub');

module.exports = {
  name: 'attendees-matcher',
  actions: {
    async matchAttendees(ctx) {
      const { eventUri, actorUri } = ctx.params;
      let contacts = {},
        profiles = {},
        attendees = {};

      const { body: event } = await ctx.call('pod-resources.get', {
        resourceUri: eventUri,
        actorUri
      });

      const attendeesUris = await ctx.call('pod-collections.getItems', {
        collectionUri: event['apods:attendees'],
        actorUri
      });

      // First get all contacts from all attendees
      for (let attendeeUri of attendeesUris) {
        try {
          ({ body: attendees[attendeeUri] } = await ctx.call('pod-resources.get', {
            resourceUri: attendeeUri,
            actorUri: attendeeUri
          }));

          // Get the attendee's profile (fetch as the attendee to prevent permissions issues)
          ({ body: profiles[attendeeUri] } = await ctx.call('pod-resources.get', {
            resourceUri: attendees[attendeeUri].url,
            actorUri: attendeeUri
          }));

          // Get the attendee's contacts list (fetch as the attendee to prevent permissions issues)
          contacts[attendeeUri] = await ctx.call('pod-collections.getItems', {
            collectionUri: attendees[attendeeUri]['apods:contacts'],
            actorUri: attendeeUri
          });
        } catch (e) {
          this.logger.warn(
            `Attendee ${attendeeUri} could not be fully fetched, ignoring... (Error message: ${e.message})`
          );
        }
      }

      // Walk through the attendees object so that unfetchable attendees are ignored completely
      for (let attendeeUri of Object.keys(attendees)) {
        for (let otherAttendeeUri of Object.keys(attendees).filter(uri => uri !== attendeeUri)) {
          const alreadyConnected = contacts[attendeeUri].includes(otherAttendeeUri);
          if (!alreadyConnected) {
            const { summary, content } = await ctx.call('translator.translate', {
              template: {
                summary: {
                  en: `Add {{{profile.vcard:given-name}}} to your network`,
                  fr: `Ajoutez {{{profile.vcard:given-name}}} à votre réseau`
                },
                content: {
                  en: `Following the event {{{event.name}}}, you may add {{{profile.vcard:given-name}}} to your network.`,
                  fr: `Suite à la rencontre {{{event.name}}}, vous avez la possibilité d'ajouter {{{profile.vcard:given-name}}} à vos contacts.`
                }
              },
              templateParams: {
                event,
                profile: profiles[attendeeUri]
              },
              actorUri: otherAttendeeUri
            });

            await ctx.call('pod-outbox.post', {
              activity: {
                type: ACTIVITY_TYPES.OFFER,
                actor: attendees[attendeeUri].id,
                object: {
                  type: ACTIVITY_TYPES.ADD,
                  object: attendees[attendeeUri].url
                },
                summary,
                content,
                context: event.id,
                target: otherAttendeeUri,
                to: otherAttendeeUri
              },
              actorUri: attendees[attendeeUri].id
            });
          }
        }
      }
    }
  },
  events: {
    async 'event.finished'(ctx) {
      const { eventUri, actorUri } = ctx.params;
      await this.actions.matchAttendees({ eventUri, actorUri }, { parentCtx: ctx });
    }
  }
};
