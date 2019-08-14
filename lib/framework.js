'use strict';

const path = require('path');

// jshint node: true

let disconnectedBrowser;

function getConfig(fullConfig) {
  // ensure we can manipulate config settings
  const config = (fullConfig.parallelOptions =
    fullConfig.parallelOptions || {});
  config.shardIndexMap = {};
  config.nextShardIndex = {};
  config.browserIdAlias = {};
  config.shardStrategy = config.shardStrategy || 'round-robin';
  config.customShardStrategy =
    config.customShardStrategy ||
    function() {
      throw new Error(
        'Should specify a "customShardStrategy" function when using shardStrategy: "custom"'
      );
    };
  config.aggregatedReporterTest =
    'aggregatedReporterTest' in config
      ? config.aggregatedReporterTest
      : /coverage|istanbul|junit/i;
  config.executors = Math.max(
    1,
    config.executors || require('os').cpus().length - 1
  );
  return config;
}

function setupMiddleware(log, fullConfig) {
  // ensure we load our middleware before karma's middleware for sharding
  fullConfig.beforeMiddleware = fullConfig.beforeMiddleware
    ? fullConfig.beforeMiddleware
    : [];
  if (fullConfig.beforeMiddleware.indexOf('parallel') === -1) {
    log.debug('adding "parallel" beforeMiddleware to configuration');
    fullConfig.beforeMiddleware.unshift('parallel');
  }
}

function setBrowserCount(config, browsers, log) {
  const executors = config.executors;
  if (executors > 1) {
    for (let i = 0, ii = browsers.length; i < ii; i++) {
      const shardedBrowsers = new Array(executors - 1).fill(browsers[i]);
      browsers.push.apply(browsers, shardedBrowsers);
    }
    browsers.sort();
  }
  log.info(
    'sharding specs across',
    config.executors,
    config.executors === 1 ? 'browser' : 'browsers'
  );
}

// TODO: Browser unregister??
// We likely need to reset our shard indexes and browser-id aliases
// if we restart our browsers or if connections get reset.
function handleBrowserRegister(log, config, browser) {
  // Create a alias Id for each browser.name. Used in identifying coverage reports

  config.browserIdAlias[browser.name] =
    config.browserIdAlias[browser.name] ||
    Math.floor(Math.random() * Date.now());
  config.nextShardIndex[browser.name] =
    config.nextShardIndex[browser.name] || 0;
  config.shardIndexMap[browser.id] = config.nextShardIndex[browser.name];
  log.debug(
    `registering browser id ${browser.id} with aggregated browser id ${
      config.browserIdAlias[browser.name]
    } at shard index ${config.shardIndexMap[browser.id]}`
  );
  config.nextShardIndex[browser.name]++;
}

module.exports = function(/* config */ fullConfig, emitter, logger) {
  if (fullConfig.frameworks[0] !== 'parallel') {
    // We have to be loaded first to make sure we load our parallelizer script *after* the jasmine/mocha script runs
    throw new Error(
      `The "parallel" framework must be loaded first into the karma frameworks array. \nActual: config.frameworks: ${JSON.stringify(
        fullConfig.frameworks
      )}`
    );
  }

  fullConfig.files.unshift({
    pattern: path.join(__dirname, 'karma-parallelizer.js'),
    included: true,
    served: true,
    watched: false
  });

  const log = logger.create('framework:karma-parallel');
  const config = getConfig(fullConfig);
  setupMiddleware(log, fullConfig);
  setBrowserCount(config, fullConfig.browsers, log);
  emitter.on('browser_register', (browser) => {
    log.debug('disconnectedBrowser', disconnectedBrowser);

    // If there is disconnected browser
    if (disconnectedBrowser) {
      disconnectedBrowser = false;
      const currentShardedIndexes = [];
      const expectedShardedIndexes = [];

      for (let i = 0; i < config.executors; i++) {
        expectedShardedIndexes.push(i);
      }
      
      Object.keys(config.shardIndexMap)
        .forEach((key) => {
          currentShardedIndexes.push(config.shardIndexMap[key]);
        });

      // Get missing executr index
      log.debug('currentShardedIndexes, expectedShardedIndexes', currentShardedIndexes, expectedShardedIndexes);
      const diff = arr_diff(currentShardedIndexes, expectedShardedIndexes);
      log.debug('shard index', diff);

      if (diff.length !== 0) {
        // Re-register the browser with valid shard id.
        config.shardIndexMap[browser.id] = diff[0];
        log.debug(
          `Re - registering browser id ${browser.id} with aggregated browser id ${
            config.browserIdAlias[browser.name]
          } at shard index ${config.shardIndexMap[browser.id]}`
        );

        log.debug('SHARDEDINFO', config.shardIndexMap);
      }
    } else {
      handleBrowserRegister(log, config, browser);
    }
  });

  emitter.on('browser_error', (browser, data) => {
    delete config.shardIndexMap[browser.id];
  
    disconnectedBrowser = true;
    log.debug('browser_error', browser, data);
  });
};

function arr_diff (a1, a2) {
  const a = [], diff = [];

  for (let i = 0; i < a1.length; i++) {
    a[a1[i]] = true;
  }

  for (let i = 0; i < a2.length; i++) {
    if (a[a2[i]]) {
      delete a[a2[i]];
    } else {
      a[a2[i]] = true;
    }
  }

  for (let k in a) {
    diff.push(k);
  }

  return diff;
}