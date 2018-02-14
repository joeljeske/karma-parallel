
module.exports = function(config) {
  require('./base.conf.js')(config);
  config.plugins.push('karma-jasmine');
  config.frameworks.push('jasmine');
};
