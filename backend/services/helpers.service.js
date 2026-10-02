const { ControlledContainerMixin } = require('@semapps/ldp');

module.exports = {
  name: 'helpers',
  mixins: [ControlledContainerMixin],
  settings: {
    acceptedTypes: ['apods:Helper'],
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
