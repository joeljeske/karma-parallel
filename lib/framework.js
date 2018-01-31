'use strict';

const path = require('path');
const _ = require('lodash');

// jshint node: true

function getConfig(fullConfig) {
  // ensure we can manipulate config settings
  const config = fullConfig.parallelOptions = (fullConfig.parallelOptions || {});
  config.shardIndexMap = {};
  config.nextShardIndex = {};
  config.browserIdAlias = {};
  config.shardStrategy = config.shardStrategy || 'round-robin';
  config.aggregatedReporterTest = ('aggregatedReporterTest' in config) ? config.aggregatedReporterTest : /coverage|istanbul/i;
  config.executors = config.executors || require('os').cpus().length - 1;
  return config;
}

function setupMiddleware(fullConfig) {
  // ensure we load our middleware before karma's middleware for sharding
  fullConfig.beforeMiddleware = fullConfig.beforeMiddleware ? fullConfig.beforeMiddleware : [];
  if (fullConfig.beforeMiddleware.indexOf('parallel') === -1) {
    fullConfig.beforeMiddleware.unshift('parallel');
  }
}

function setBrowserCount(config, browsers, log) {
  const executors = config.executors;
  if (executors > 1) {
    for (let i = 0, ii = browsers.length; i<ii; i++) {
      const shardedBrowsers = new Array(executors - 1).fill(browsers[i]);
      browsers.push.apply(browsers, shardedBrowsers);
    }
    browsers.sort();
  }
  log.info('sharding specs across', config.executors, config.executors === 1 ? 'browser' : 'browsers');
}

// TODO: Browser unregister??
// We likely need to reset our shard indexes and browser-id aliases
// if we restart our browsers or if connections get reset.
function handleBrowserRegister(config, browser) {
  // Create a alias Id for each browser.name. Used in identifying coverage reports
  config.browserIdAlias[browser.name] = config.browserIdAlias[browser.name] || Math.floor(Math.random()*Date.now());
  config.nextShardIndex[browser.name] = config.nextShardIndex[browser.name] || 0;
  config.shardIndexMap[browser.id] = config.nextShardIndex[browser.name];
  config.nextShardIndex[browser.name]++;
}

function setupCoverageReporters(config, reporters) {
  // Look for possible coverage reporters and remove them from the reporters list.
  // They will get instantiated from our reporter
  if (!config.aggregatedReporterTest) {
    return;
  }

  if (_.isRegExp(config.aggregatedReporterTest)) {
    config.aggregatedReporterTest = config.aggregatedReporterTest.test.bind(config.aggregatedReporterTest);
  }

  // Remove our reporter in case it was added explicitly
  _.remove(reporters, 'parallel-coverage');

  config.coverageReporters = _.remove(reporters, config.aggregatedReporterTest);

  if (!_.isEmpty(config.coverageReporters)) {
    reporters.push('parallel-coverage');
  }
}

module.exports = function(/* config */fullConfig, emitter, logger) {
  if (fullConfig.frameworks[0] !== 'parallel') {
    // We have to be loaded first to make sure we load our parallelizer script *after* the jasmine/mocha script runs
    throw new Error(`The "parallel" framework must be loaded first into the karma frameworks array. \nActual: config.frameworks: ${JSON.stringify(fullConfig.frameworks)}`);
  }

  fullConfig.files.unshift({pattern: path.join(__dirname, 'karma-parallelizer.js'), included: true, served: true, watched: false});

  const log = logger.create('framework:karma-parallel');
  const config = getConfig(fullConfig);
  setupMiddleware(fullConfig);
  setupCoverageReporters(config, fullConfig.reporters);
  setBrowserCount(config, fullConfig.browsers, log);
  emitter.on('browser_register', (browser) => handleBrowserRegister(config, browser));
};
