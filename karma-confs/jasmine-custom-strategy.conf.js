
module.exports = function(config) {
  require('./jasmine.conf.js')(config);
  require('./custom-strategy.conf')(config);
};
