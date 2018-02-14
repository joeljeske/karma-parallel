module.exports = function(config) {
  config.plugins.push('karma-junit-reporter');
  config.reporters = ['junit'];
  config.junitReporter = {
    outputDir: 'reports/junit/'
  };
  config.parallelOptions.aggregatedReporterTest = /junit/i;
};
