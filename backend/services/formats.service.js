const { ControlledContainerMixin } = require('@semapps/ldp');

module.exports = {
  name: 'formats',
  mixins: [ControlledContainerMixin],
  settings: {
    acceptedTypes: ['apods:EventFormat'],
    permissions: {
      anon: {
        read: true
      },
      anyUser: {
        write: true
      }
    },
    newResourcesPermissions: webId => ({
      anon: {
        read: true
      },
      user: {
        uri: webId,
        write: true,
        control: true
      }
    })
  }
};
