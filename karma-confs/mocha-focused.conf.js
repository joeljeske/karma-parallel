
module.exports = function(config) {
  require('./mocha.conf.js')(config);
  require('./focused.conf.js')(config);
};
