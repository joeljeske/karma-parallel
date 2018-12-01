
module.exports = function(config) {
  require('./mocha.conf.js')(config);
  require('./custom-strategy.conf')(config);
};
