// Karma configuration
module.exports = function(config) {
  config.set({
    basePath: '..',
    plugins: [
      'karma-chrome-launcher',
      require('..')
    ],
    frameworks: ['parallel'],
    reporters: ['progress'],
    files: ['test/*.js'],
    exclude: ['test/*.focused.spec.js'],
    parallelOptions: {
      executors: 4,
      shardStrategy: 'round-robin'
    },
    browsers: ['ChromeHeadless'],
    autoWatch: false,
    singleRun: true
  });
};
