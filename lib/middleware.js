'use strict';

//jshint node:true

const path = require('path');
const fs = require('fs');

const karmaParallelScriptName = 'karma-parallelizer.js';
const karmaParallelScript = fs.readFileSync(path.join(__dirname, karmaParallelScriptName), 'utf8'); // eslint-disable-line security/detect-non-literal-fs-filename

const idParamExtractor = /\/\?id=(\d+)/;
const idCookieExtractor = /karmaParallelBrowser.id=(\d+)/;

function setBrowserIdCookie(request, response) {
  if (request.url.indexOf('/?id=') === 0) {
    const id = idParamExtractor.exec(request.url)[1];
    response.setHeader('Set-Cookie', `karmaParallelBrowser.id=${id};`);
  }
}

function getBrowserIdCookie(request) {
  const match = idCookieExtractor.exec(request.headers.cookie);
  return match && match.length && match[1];
}

function writeKarmaSharderInfo(config, request, response) {
  const id = getBrowserIdCookie(request);
  const payload = {
    shouldShard: !!id && config.shardIndexMap.hasOwnProperty(id),
    shardIndex: config.shardIndexMap[id],
    executors: config.executors,
    shardStrategy: config.shardStrategy
  };
  response.writeHead(200, {'Content-Type': 'application/javascript'});
  response.end(karmaParallelScript.replace('%KARMA_SHARD_INFO%', JSON.stringify(payload)));
}

module.exports = function(/* config */fullConfig, /* config.parallelOptions */config) {
  return function (request, response, next) {
    // Responsible for finding the id of the browser and saving it as a cookie so all future requests can access it
    setBrowserIdCookie(request, response);

    // Intercept the request for the actual sharding script so we can interpolate the browser-specific shard data in it
    if (request.url.indexOf(karmaParallelScriptName) !== -1) {
      return writeKarmaSharderInfo(config, request, response);
    }

    return next();
  };

};
