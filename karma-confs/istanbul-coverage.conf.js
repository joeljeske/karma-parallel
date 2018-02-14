module.exports = function(config) {
  config.plugins.push('karma-coverage', 'karma-coverage-istanbul-reporter');
  config.reporters.push('coverage-istanbul');
  config.coverageIstanbulReporter = {
    reports: [ 'html' ],
    dir: 'reports/istanbul-coverage/'
  };
  config.preprocessors = {
    'test/**/*.js': ['coverage']
  };
};

