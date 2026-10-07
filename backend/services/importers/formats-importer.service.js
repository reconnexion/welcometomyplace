const path = require('path');
const urlJoin = require('url-join');
const { ImporterMixin } = require('@semapps/importer');
const CONFIG = require('../../config/config');

module.exports = {
  name: 'importers.formats',
  mixins: [ImporterMixin],
  settings: {
    source: {
      getAllFull: path.resolve(__dirname, `./data/formats-${CONFIG.APP_LANG}.json`),
      fieldsMapping: {
        slug: 'label'
      }
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, '/apods/event-format')
    }
  },
  dependencies: ['formats'],
  async started() {
    // Import the formats on a fresh dataset (e.g. a new preview deployment)
    const isEmpty = await this.broker.call('ldp.container.isEmpty', {
      containerUri: this.settings.dest.containerUri,
      webId: 'system'
    });
    if (isEmpty) {
      this.logger.info('No event formats found, importing them...');
      await this.actions.freshImport({ clear: false });
    }
  },
  methods: {
    transform(data) {
      return {
        '@type': 'apods:EventFormat',
        'rdfs:label': data.label,
        'skos:broader': data.parent ? urlJoin(CONFIG.HOME_URL, data.parent) : undefined
      };
    }
  }
};
