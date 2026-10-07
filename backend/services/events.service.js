const urlJoin = require('url-join');
const { PodResourcesHandlerMixin } = require('@activitypods/app');
const CONFIG = require('../config/config');

module.exports = {
  name: 'events',
  mixins: [PodResourcesHandlerMixin],
  settings: {
    shapeTreeUri: urlJoin(CONFIG.SHAPE_REPOSITORY_URL, 'shapetrees/as/Event')
  },
  actions: {
    async getAnnouncesGroupUri(ctx) {
      const { resourceUri } = ctx.params;

      // Guess the name of the announces collection URI as it may not have been created yet
      const announcesCollectionUri = urlJoin(resourceUri, 'announces');

      return await ctx.call('pod-wac-groups.getUriFromCollectionUri', {
        collectionUri: announcesCollectionUri
      });
    }
  },
  methods: {
    async onCreate(ctx, resource, actorUri) {
      await ctx.call('status.tagNewEvent', { event: resource, actorUri });

      await ctx.call('locations.giveReadPermissionsToAnnouncesGroup', { event: resource, actorUri });
    },
    async onUpdate(ctx, resource, actorUri) {
      await ctx.call('status.tagUpdatedEvent', { event: resource, actorUri });

      // TODO use PATCH method to be able to know the previous location and remove its rights
      await ctx.call('locations.giveReadPermissionsToAnnouncesGroup', { event: resource, actorUri });
    }
  }
};
