
module.exports = function(config) {
  require('./base.conf.js')(config);
  config.plugins.push('karma-mocha', 'karma-chai');
  config.frameworks.push('mocha', 'chai');
};
