module.exports = function(config) {
  require('./mocha.conf.js')(config);
  require('./istanbul-coverage.conf.js')(config);
  config.coverageIstanbulReporter.dir += 'mocha/';
};
