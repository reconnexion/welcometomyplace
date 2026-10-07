const { ControlledContainerMixin } = require('@semapps/ldp');

module.exports = {
  name: 'files',
  mixins: [ControlledContainerMixin],
  settings: {
    acceptedTypes: ['semapps:File'],
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
