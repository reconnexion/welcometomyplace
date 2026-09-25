const { ACTIVITY_TYPES, OBJECT_TYPES } = require('@semapps/activitypub');
const { PodActivitiesHandlerMixin } = require('@activitypods/app');
const { arrayOf } = require('@semapps/ldp');

module.exports = {
  name: 'invitation',
  mixins: [PodActivitiesHandlerMixin],
  activities: {
    invite: {
      match: {
        type: ACTIVITY_TYPES.ANNOUNCE,
        object: {
          type: OBJECT_TYPES.EVENT
        }
      },
      async onEmit(ctx, activity) {
        // An Announce carrying a context is a consequence of an activity its recipient sent
        // themselves — someone joining through a public event link, see `registration.service.js`.
        // They asked for this, so telling them they have been invited would be misleading.
        if (activity.context) return;

        // We send the notification directly to the recipients, in case they haven't installed the app yet
        for (const recipientUri of arrayOf(activity.to)) {
          await ctx.call('pod-notifications.send', {
            template: {
              title: {
                en: `{{emitterProfile.vcard:given-name}} invites you to an event "{{activity.object.name}}"`,
                fr: `{{emitterProfile.vcard:given-name}} vous invite à une rencontre "{{activity.object.name}}"`
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
            context: activity.object.id,
            recipientUri
          });
        }
      }
    }
  }
};
