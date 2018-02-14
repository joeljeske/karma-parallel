module.exports = function(config) {
  require('./jasmine.conf.js')(config);
  require('./istanbul-coverage.conf.js')(config);
  config.coverageIstanbulReporter.dir += 'jasmine/';
};
