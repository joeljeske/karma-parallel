module.exports = function(config) {
  config.parallelOptions.shardStrategy = 'custom';
  config.parallelOptions.customShardStrategy = function(values) {
      return values.shardIndex === 1;
  };
};
