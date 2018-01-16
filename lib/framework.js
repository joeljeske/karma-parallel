'use strict';

// jshint node: true

function getConfig(fullConfig) {
  // ensure we can manipulate config settings
  const config = fullConfig.parallelOptions = (fullConfig.parallelOptions || {});
  config.shardIndexMap = {};
  config.nextShardIndex = {};
  config.shardStrategy = config.shardStrategy || 'round-robin';
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

function handleBrowserRegister(config, browser) {
  config.nextShardIndex[browser.name] = config.nextShardIndex[browser.name] || 0;
  config.shardIndexMap[browser.id] = config.nextShardIndex[browser.name];
  config.nextShardIndex[browser.name]++;
}

function generateEmitter(emitter, fullConfig, config) {
  const originalEmit = emitter.emit;
  emitter.emit = function (event, entry) {
    switch(event) {
    case 'browser_register':
      handleBrowserRegister(config, entry);
      break;
    }
    return originalEmit.apply(emitter, arguments);
  };
}

module.exports = function(/* config */fullConfig, emitter, logger) {
  const log = logger.create('framework:karma-parallel');
  const config = getConfig(fullConfig);
  setupMiddleware(fullConfig);
  setBrowserCount(config, fullConfig.browsers, log);
  // Intercepting the file_list_modified event as Vojta Jina describes here:
  // https://github.com/karma-runner/karma/issues/851#issuecomment-30290071
  generateEmitter(emitter, fullConfig, config, log);
};
