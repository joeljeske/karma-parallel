module.exports = function(config) {
  config.plugins.push('karma-coverage');
  config.reporters.push('coverage');
  config.coverageReporter = {
    type : 'html',
    dir : 'reports/coverage/'
  };
  config.preprocessors = {
    'test/**/*.js': ['coverage']
  };
};
