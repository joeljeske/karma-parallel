module.exports = function(config) {
  require('./jasmine.conf.js')(config);
  require('./junit.conf.js')(config);
  config.junitReporter.outputDir += 'jasmine/';
};
