
module.exports = function(config) {
  require('./jasmine.conf.js')(config);
  require('./coverage.conf.js')(config);
  config.coverageReporter.dir += 'jasmine/';
};
