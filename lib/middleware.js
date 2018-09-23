'use strict';

//jshint node:true

const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const karmaParallelScriptName = 'karma-parallelizer.js';
const karmaParallelScript = fs.readFileSync(path.join(__dirname, karmaParallelScriptName), 'utf8'); // eslint-disable-line security/detect-non-literal-fs-filename

function createKarmaSharderInfoMap(config) {
  return JSON.stringify(Object
    .keys(config.shardIndexMap)
    .map((id) => [ id, {
      shouldShard: !!id && config.shardIndexMap.hasOwnProperty(id),
      shardIndex: config.shardIndexMap[id],
      executors: config.executors,
      shardStrategy: config.shardStrategy
    } ])
    .reduce((payloadMap, [ id, payload ]) => {
      payloadMap[id.toString()] = payload;

      return payloadMap;
    }, { }));
}

function writeKarmaSharderInfoMap(log, config, response) {
  const karmaSharderInfoMap = createKarmaSharderInfoMap(config);
  log.debug(`interpolating parallel shard data map in script. Data: ${karmaSharderInfoMap}`);
  response.writeHead(200, {'Content-Type': 'application/javascript'});
  response.end(karmaParallelScript.replace('%KARMA_SHARD_INFO%', karmaSharderInfoMap));
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
    // Intercept the request for the actual sharding script so we can interpolate the shard data in it
    if (request.url.indexOf(karmaParallelScriptName) !== -1) {
      return writeKarmaSharderInfoMap(log, config, response);
    }

    return next();
  };

};
