'use strict';

// This file gets loaded into the executing browsers and overrides the `describe` functions

function initKarmaParallelizer(root, shardIndexInfo) {
  if (!shardIndexInfo || !shardIndexInfo.shouldShard) {
    // console.log('Skipping sharding. Could not find index and count values');
    return;
  }

  const overrideSpecSuite = getSpecSuiteOverrider(shardIndexInfo);
  ['describe', 'ddescribe', 'fdescribe'].forEach(function(methodName) {
    replaceMethod(root, methodName, overrideSpecSuite);
  });
}

function replaceMethod(root, methodName, overrider) {
  const tmpOriginalFunction = root[methodName];
  let overriddenFunction;
  // Make a getter / setter that overrides the method when initialized
  Object.defineProperty(root, methodName, {
    enumerable: true,
    configurable: true,
    get: function() {
      return overriddenFunction;
    },
    set: function(method) {
      overriddenFunction = overrider(method);
    }
  });

  // If we already have a function on the global, immediately set it back which wraps and overrides it
  if (typeof tmpOriginalFunction === 'function') {
    root[methodName] = tmpOriginalFunction;
  }
}

function getSpecSuiteOverrider(shardIndexInfo) {
  switch (shardIndexInfo.shardStrategy) {
  case 'description-length':
    return createDescriptionLengthSpecSuiteOverrider(shardIndexInfo);
  case 'round-robin':
    /* falls through */
  default:
    return createRoundRobinBasedSpecSuiteOverrider(shardIndexInfo);
  }
}

function createDescriptionLengthSpecSuiteOverrider({shardIndex, executors}) {
  let depth = 0;
  return function overrideSpecSuite(origDescribe) {
    return function(description, specDefinitions) {
      // If we are a top-level describe but our description doesn't match our responsibility, skip it
      if (depth === 0 && description.length % executors !== shardIndex) {
        // console.log('[skipping]', description);
      } else {
        origDescribe(description, function() {
          depth++;
          specDefinitions();
          depth--;
        });
      }
    };
  };
}

function createRoundRobinBasedSpecSuiteOverrider({shardIndex, executors}) {
  let depth = 0;
  let count = 0;

  return function overrideSpecSuite(origDescribe) {
    return function(description, specDefinitions) {
      // If we are a top-level describe but our description doesn't match our responsibility, skip it
      if (depth === 0 && count++ % executors !== shardIndex) {
        // console.log('[skipping]', description);
      } else {
        origDescribe(description, function() {
          depth++;
          specDefinitions();
          depth--;
        });
      }
    };
  };
}

initKarmaParallelizer(window, JSON.parse('%KARMA_SHARD_INFO%'));
