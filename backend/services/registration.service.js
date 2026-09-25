const urlJoin = require('url-join');
const { MoleculerError } = require('moleculer').Errors;
const { ACTIVITY_TYPES, OBJECT_TYPES } = require('@semapps/activitypub');
const { PodActivitiesHandlerMixin } = require('@activitypods/app');
const { arrayOf } = require('@semapps/ldp');

module.exports = {
  name: 'registration',
  mixins: [PodActivitiesHandlerMixin],
  methods: {
    /**
     * Decide whether a `Join` from someone who was never invited may be accepted anyway, on the
     * strength of the credential behind a public event link (see the share dialog's "general
     * access" setting, and `frontend/src/utils/capability.ts` for how the credential is minted).
     *
     * The credential's URI travels on the activity's `instrument` — not on `capability`, which
     * holds the signed presentation the organizer's Pod verifies on receipt but which, not being
     * an ActivityStreams term, does not survive being stored in the triplestore and so is gone by
     * the time we read the activity back from the Pod.
     *
     * That presentation check happens on the Pod and its failures are only logged, so it cannot
     * be relied on here. What makes this safe on its own is re-fetching the credential from the
     * organizer's own Pod: possession of an unguessable, still-existing credential URI *is* the
     * authorization, exactly as for a "anyone with the link" share.
     */
    async isAllowedByPublicLink(ctx, activity, event, organizerUri) {
      const capabilityUri = activity.instrument?.id || activity.instrument;
      if (typeof capabilityUri !== 'string') return false;

      // Only the organizer can have issued a credential granting access to their own event, so
      // anything hosted elsewhere is not worth dereferencing.
      if (!capabilityUri.startsWith(urlJoin(organizerUri, '/'))) return false;

      // Fetch it fresh rather than trusting whatever the sender attached: this proves the link
      // has not been revoked (a deleted credential 404s here) and means the grant being checked
      // is the organizer's own wording.
      const { ok, body: capability } = await ctx.call('pod-resources.get', {
        resourceUri: capabilityUri,
        actorUri: organizerUri
      });
      if (!ok || !capability || capability.issuer !== organizerUri) return false;

      return arrayOf(capability.credentialSubject).some(subject =>
        arrayOf(subject['apods:hasActivityGrant']).some(grant => {
          const object = grant['as:object']?.id || grant['as:object'];
          const types = arrayOf(grant.type || grant['@type']);
          return object === event.id && types.some(type => typeof type === 'string' && type.endsWith('Join'));
        })
      );
    }
  },
  activities: {
    join: {
      match: {
        type: ACTIVITY_TYPES.JOIN,
        object: {
          type: OBJECT_TYPES.EVENT
        }
      },
      async onEmit(ctx, activity, actorUri) {
        const event = activity.object;
        const organizerUri = event['dc:creator'];

        const { body: actor } = await ctx.call('pod-resources.get', { resourceUri: actorUri, actorUri });

        const contactsGroupUri = await ctx.call('pod-wac-groups.getUriFromCollectionUri', {
          collectionUri: actor['apods:contacts'],
        });

        // Ensure the organizer is in the contacts WebACL group of the emitter so he can see his profile (and write to him)
        await ctx.call('pod-wac-groups.addMember', {
          groupUri: contactsGroupUri,
          memberUri: organizerUri,
          actorUri
        });
      },
      async onReceive(ctx, activity, actorUri) {
        const event = activity.object;

        if (await ctx.call('status.isFinished', { event })) {
          throw new MoleculerError('This event is finished', 403, 'FORBIDDEN');
        } else if (await ctx.call('status.isClosed', { event })) {
          throw new MoleculerError('Registrations for this event are closed', 403, 'FORBIDDEN');
        }

        const organizerUri = event['dc:creator'];

        // An event that was never shared has no announces collection at all
        const announces = event['apods:announces']
          ? await ctx.call('pod-collections.getItems', {
              collectionUri: event['apods:announces'],
              actorUri
            })
          : [];

        if (!announces.includes(activity.actor)) {
          const allowedByLink = await this.isAllowedByPublicLink(ctx, activity, event, organizerUri);

          if (!allowedByLink) {
            // Deliberately not a throw: someone trying to join without an invitation is an
            // expected outcome, not a processing failure. `pod-activities-watcher.processWebhook`
            // doesn't catch what a handler throws, so throwing here takes the whole app backend
            // down — along with every other Pod it was watching.
            this.logger.warn(
              `Ignoring Join of ${activity.actor} on ${event.id}: not invited, and no valid public link capability`
            );
            return;
          }

          // Put them on the same footing as an invited guest rather than leaving them dependent
          // on the link: announcing the event to them is what makes the Pod add them to
          // `apods:announces` and to the WebACL group that grants read access to the event and
          // its location.
          await ctx.call('pod-outbox.post', {
            activity: {
              type: ACTIVITY_TYPES.ANNOUNCE,
              actor: organizerUri,
              object: event.id,
              target: activity.actor,
              to: activity.actor,
              // Marks the Announce as a consequence of the recipient's own request, so that
              // `invitation.service.js` doesn't tell them they have been invited to the event
              // they just asked to join.
              context: activity.id
            },
            actorUri: organizerUri
          });
        }

        await ctx.call('attendees.add', {
          collectionUri: event['apods:attendees'],
          itemUri: activity.actor,
          actorUri
        });

        // Update the event statut (will tag the event as closed if the max attendees is reached)
        await ctx.call('status.tagUpdatedEvent', { event, actorUri });

        await ctx.call('pod-notifications.send', {
          template: {
            title: {
              en: `{{emitterProfile.vcard:given-name}} is attending your event "{{activity.object.name}}"`,
              fr: `{{emitterProfile.vcard:given-name}} participe à votre rencontre "{{activity.object.name}}"`
            },
            actions: [
              {
                caption: {
                  en: 'View',
                  fr: 'Voir'
                },
                link: '/Event/{{encodeUri activity.object.id}}/show'
              }
            ]
          },
          activity,
          context: event.id,
          recipientUri: actorUri
        });
      }
    },
    leave: {
      match: {
        type: ACTIVITY_TYPES.LEAVE,
        object: {
          type: OBJECT_TYPES.EVENT
        }
      },
      async onReceive(ctx, activity, actorUri) {
        const event = activity.object;

        const attendees = await ctx.call('pod-collections.getItems', {
          collectionUri: event['apods:attendees'],
          actorUri
        });

        if (!attendees.includes(activity.actor)) {
          throw new MoleculerError('You are not attending this event', 400);
        }

        const collectionUri = await ctx.call('attendees.getCollectionUriFromResource', {
          resource: event
        });

        await ctx.call('attendees.remove', {
          collectionUri,
          itemUri: activity.actor,
          actorUri
        });

        // Update the event statut (will tag the event as open if the max attendees is not reached anymore)
        await ctx.call('status.tagUpdatedEvent', { event, actorUri });

        await ctx.call('pod-notifications.send', {
          template: {
            title: {
              en: `{{emitterProfile.vcard:given-name}} is not attending anymore your event "{{activity.object.name}}"`,
              fr: `{{emitterProfile.vcard:given-name}} ne participe plus à votre rencontre "{{activity.object.name}}"`
            },
            actions: [
              {
                caption: {
                  en: 'View',
                  fr: 'Voir'
                },
                link: '/Event/{{encodeUri activity.object.id}}/show'
              }
            ]
          },
          activity,
          context: event.id,
          recipientUri: actorUri
        });
      }
    }
  }
};
