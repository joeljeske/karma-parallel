
module.exports = function(config) {
  require('./mocha.conf.js')(config);
  require('./coverage.conf.js')(config);
  config.coverageReporter.dir += 'mocha/';
};
