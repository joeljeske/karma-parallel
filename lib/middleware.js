'use strict';

//jshint node:true

const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const karmaParallelScriptName = 'karma-parallelizer.js';
const karmaParallelScript = fs.readFileSync(path.join(__dirname, karmaParallelScriptName), 'utf8'); // eslint-disable-line security/detect-non-literal-fs-filename

const idParamExtractor = /\/\?id=(\d+)/;
const idCookieExtractor = /karmaParallelBrowser.id=(\d+)/;

function setBrowserIdCookie(log, request, response) {
  if (request.url.indexOf('/?id=') === 0) {
    const id = idParamExtractor.exec(request.url)[1];
    const cookie = `karmaParallelBrowser.id=${id};`;
    log.debug(`setting cookie "${cookie}"`);
    response.setHeader('Set-Cookie', cookie);
  }
}

function getBrowserIdCookie(request) {
  const match = idCookieExtractor.exec(request.headers.cookie);
  return match && match.length && match[1];
}

function writeKarmaSharderInfo(log, config, request, response) {
  const id = getBrowserIdCookie(request);
  const payload = JSON.stringify({
    shouldShard: !!id && config.shardIndexMap.hasOwnProperty(id),
    shardIndex: config.shardIndexMap[id],
    executors: config.executors,
    shardStrategy: config.shardStrategy
  });
  log.debug(`interpolating parallel shard data in script. Browser: ${id}. Data: ${payload}`);
  response.writeHead(200, {'Content-Type': 'application/javascript'});
  response.end(karmaParallelScript.replace('%KARMA_SHARD_INFO%', payload));
}

function setupCoverageReporters(log, config, reporters) {
  // Look for possible coverage reporters and remove them from the reporters list.
  // They will get instantiated from our reporter
  if (!config.aggregatedReporterTest) {
    log.debug('skipping reporter aggregation');
    return;
  }

  if (_.isRegExp(config.aggregatedReporterTest)) {
    config.aggregatedReporterTest = config.aggregatedReporterTest.test.bind(config.aggregatedReporterTest);
  }

  // Remove our reporter in case it was added explicitly
  _.pull(reporters, 'parallel-coverage');

  config.coverageReporters = _.remove(reporters, config.aggregatedReporterTest);

  if (!_.isEmpty(config.coverageReporters)) {
    log.debug('reporter aggregation setup for ' + config.coverageReporters.join(', '));
    reporters.push('parallel-coverage');
  } else {
    log.debug('no reporters found for aggregation');
  }
}

module.exports = function(logger, /* config */fullConfig, /* config.parallelOptions */config) {
  const log = logger.create('middleware:parallel');
  setupCoverageReporters(log, config, fullConfig.reporters);

  return function (request, response, next) {
    // Responsible for finding the id of the browser and saving it as a cookie so all future requests can access it
    setBrowserIdCookie(log, request, response);

    // Intercept the request for the actual sharding script so we can interpolate the browser-specific shard data in it
    if (request.url.indexOf(karmaParallelScriptName) !== -1) {
      return writeKarmaSharderInfo(log, config, request, response);
    }

    return next();
  };

};
