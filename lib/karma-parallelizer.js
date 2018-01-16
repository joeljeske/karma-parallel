'use strict';

// This file gets loaded into the executing browsers and overrides the `describe` functions

function initKarmaParallelizer(root, shardIndexInfo) {
  if (!shardIndexInfo || !shardIndexInfo.shouldShard) {
    // console.log('Skipping sharding. Could not find index and count values');
    return;
  }

  const strategy = getSpecSuiteStrategy(shardIndexInfo);
  const overrideSpecSuite = createSpecSuiteOverrider(strategy);

  // Mocha uses describe.only|skip
  // Jasmine uses fdescribe|ddescribe|xdescribe

  replaceMethod(root, 'describe', function(method) {
    const overriden = overrideSpecSuite(method);
    replaceMethod(overriden, 'only', overrideSpecSuite);
    replaceMethod(overriden, 'skip', overrideSpecSuite);
    return overriden;
  });
  replaceMethod(root, 'xdescribe', overrideSpecSuite);
  replaceMethod(root, 'fdescribe', overrideSpecSuite);
  replaceMethod(root, 'ddescribe', overrideSpecSuite);
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

function getSpecSuiteStrategy(shardIndexInfo) {
  switch (shardIndexInfo.shardStrategy) {
  case 'description-length':
    return createDescriptionLengthStragegy(shardIndexInfo);
  case 'round-robin':
    /* falls through */
  default:
    return createRoundRobinStrategy(shardIndexInfo);
  }
}

function createSpecSuiteOverrider(strategy) {
  let depth = 0;
  return function overrideSpecSuite(origDescribe) {
    return function(description, specDefinitions) {
      // If we are a top-level, ask our strategy if we should be interested in this suite
      if (depth === 0 && !strategy(description, specDefinitions)) {
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

function createDescriptionLengthStragegy({shardIndex, executors}) {
  return function overrideSpecSuite(description/*, specDefinitions*/) {
    return description.length % executors === shardIndex;
  };
}

function createRoundRobinStrategy({shardIndex, executors}) {
  // Increment the count on each top level describe to determine 
  // round-robin responsibility
  let count = 0;
  return function(/*description, specDefinitions*/) {
    return count++ % executors === shardIndex;
  };
}

initKarmaParallelizer(window, JSON.parse('%KARMA_SHARD_INFO%'));
