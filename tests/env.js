// Config of the app server started by the tests (read by backend/config/config.js)
Object.assign(process.env, {
  SEMAPPS_APP_NAME: 'Welcome to my place',
  SEMAPPS_APP_DESCRIPTION: 'Test instance',
  SEMAPPS_APP_LANG: 'en',
  SEMAPPS_HOME_URL: 'http://localhost:3001/',
  SEMAPPS_FRONT_URL: 'http://localhost:4001/',
  SEMAPPS_PORT: '3001',
  SEMAPPS_SHAPE_REPOSITORY_URL: 'https://shapes.activitypods.org/',
  SEMAPPS_SPARQL_ENDPOINT: 'http://localhost:3041/',
  SEMAPPS_JENA_USER: 'admin',
  SEMAPPS_JENA_PASSWORD: 'admin',
  SEMAPPS_MAIN_DATASET: 'wtmp',
  SEMAPPS_AUTH_ACCOUNTS_DATASET_NAME: 'wtmp_settings',
  SEMAPPS_REDIS_CACHE_URL: '',
  SEMAPPS_QUEUE_SERVICE_URL: 'redis://localhost:6390/7',
  SEMAPPS_RESCHEDULE_TIMERS_ON_START: 'false'
});
