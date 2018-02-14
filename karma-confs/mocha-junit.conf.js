module.exports = function(config) {
  require('./mocha.conf.js')(config);
  require('./junit.conf.js')(config);
  config.junitReporter.outputDir += 'mocha/';
};
