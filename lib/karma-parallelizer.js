'use strict';

// This file gets loaded into the executing browsers and overrides the `describe` functions

function initKarmaParallelizer(root, karma, shardIndexInfoMap) {
  var idParamExtractor = /(\?|&)id=(\d+)(&|$)/;
  var matches = idParamExtractor.exec(parent.location.search);
  var id = (matches && matches[2]) || null;

  if (
    !id ||
    !shardIndexInfoMap.hasOwnProperty(id) ||
    !shardIndexInfoMap[id].shouldShard
  ) {
    /* eslint-disable-next-line no-console */
    console.warn(
      'Skipping sharding. Could not find karma-parallel initialization data.'
    );
    return;
  }

  var shardIndexInfo = shardIndexInfoMap[id];
  var strategy = overrideSuiteStategy(getSpecSuiteStrategy(shardIndexInfo));
  var fakeContextStatus = createFakeTestContext(root, strategy);

  var origStart = karma.start;
  karma.start = function() {
    fakeContextStatus.beforeStartup();
    origStart.call(this);
  };
}

function getSpecSuiteStrategy(shardIndexInfo) {
  switch (shardIndexInfo.shardStrategy) {
  case 'description-length':
    return createDescriptionLengthStrategy(shardIndexInfo);
  case 'custom':
    return createCustomStrategy(shardIndexInfo);
  case 'round-robin':
    /* falls through */
  default:
    return createRoundRobinStrategy(shardIndexInfo);
  }
}

function overrideSuiteStategy(strategy) {
  return function(description, specDefinitions) {
    if (description && description.indexOf('[always]') === 0) {
      return true;
    }
    return strategy(description, specDefinitions);
  };
}

function createDescriptionLengthStrategy(shardIndexInfo) {
  var shardIndex = shardIndexInfo.shardIndex,
    executors = shardIndexInfo.executors;
  return function overrideSpecSuite(description /*, specDefinitions*/) {
    return Number(description.length % executors) === Number(shardIndex);
  };
}

function createCustomStrategy(shardIndexInfo) {
  var shardIndex = shardIndexInfo.shardIndex,
    executors = shardIndexInfo.executors,
    // eslint-disable-next-line security/detect-eval-with-expression
    evaluator = new Function('return ' + atob(shardIndexInfo.customShardStrategy))();
  return function(description /*, specDefinitions*/) {
    return !!evaluator({
      shardIndex: shardIndex,
      executors: executors,
      description: description
    });
  };
}

function createRoundRobinStrategy(shardIndexInfo) {
  var shardIndex = shardIndexInfo.shardIndex,
    executors = shardIndexInfo.executors;
  // Increment the count on each top level describe to determine
  // round-robin responsibility
  var count = 0;
  return function(/*description, specDefinitions*/) {
    return Number(count++ % executors) === Number(shardIndex);
  };
}

function createFakeTestContext(ctx, shouldUseDescription) {
  var depth = 0;
  var isFaking = false; // Are we currently faking out describe blocks to look for tests for other instances
  var hasFocusedWhileFaking = false; // Have we found a focus tests for another instance
  var hasFocusedWithoutFaking = false; // Have we registerd at least one focus test for this instance
  var hasOwnSpecs = false; // Have we registered at least one test for this instance
  var hasOtherSpecs = false; // Have we seen at least one test for another instance
  var forceDescribe = false; //

  function wrapDescription(def) {
    return function() {
      try {
        depth++;
        def.call(this);
      } finally {
        depth--;
      }
    };
  }

  // On focus spec in mocha we need to return the test result and need to
  function wrap(fn, isFocus, isDescription, isSpec) {
    if (!fn) return fn;
    return function(name, def) {
      if (isDescription && depth === 0) {
        // Reset isFaking on top-level descriptions
        isFaking = !shouldUseDescription(name, def);
      }

      hasOwnSpecs = hasOwnSpecs || (isSpec && !isFaking);
      hasOtherSpecs = hasOtherSpecs || (isSpec && isFaking);
      hasFocusedWhileFaking = hasFocusedWhileFaking || (isFocus && isFaking);
      hasFocusedWithoutFaking =
        hasFocusedWithoutFaking || (isFocus && !isFaking);

      if (isDescription) def = wrapDescription(def);

      if (!isFaking || forceDescribe) {
        // Call through to framework and return the result
        return fn.call(this, name, def);
      } else if (isDescription) {
        // If its a fake description, then we need to call through to eval inner its() looking for focuses
        // TODO, do we ever need parameters?
        def();
      }
    };
  }

  // Save as vars before we replace them
  var describeOnly = ctx.describe.only;
  var describeSkip = ctx.describe.skip;
  var itOnly = ctx.it.only;
  var itSkip = ctx.it.skip;

  ctx.describe      = wrap(ctx.describe,   false, true,  false);
  ctx.context       = wrap(ctx.context,    false, true,  false);
  ctx.xdescribe     = wrap(ctx.xdescribe,  false, true,  false);
  ctx.describe.skip = wrap(describeSkip,   false, true,  false);
  ctx.fdescribe     = wrap(ctx.fdescribe,  true,  true,  false);
  ctx.ddescribe     = wrap(ctx.ddescribe,  true,  true,  false);
  ctx.describe.only = wrap(describeOnly,   true,  true,  false);

  ctx.it            = wrap(ctx.it,         false, false, true);
  ctx.specify       = wrap(ctx.specify,    false, false, true);
  ctx.xit           = wrap(ctx.xit,        false, false, true);
  ctx.xspecify      = wrap(ctx.xspecify,   false, false, true);
  ctx.it.skip       = wrap(itSkip,         false, false, true);
  ctx.fit           = wrap(ctx.fit,        true,  false, true);
  ctx.iit           = wrap(ctx.iit,        true,  false, true);
  ctx.it.only       = wrap(itOnly,         true,  false, true);

  ctx.before        = wrap(ctx.before,     false, false, false);
  ctx.beforeAll     = wrap(ctx.beforeAll,  false, false, false);
  ctx.beforeEach    = wrap(ctx.beforeEach, false, false, false);
  ctx.after         = wrap(ctx.after,      false, false, false);
  ctx.afterAll      = wrap(ctx.afterAll,   false, false, false);
  ctx.afterEach     = wrap(ctx.afterEach,  false, false, false);

  return {
    beforeStartup: function() {
      forceDescribe = true;
      if (hasFocusedWhileFaking && !hasFocusedWithoutFaking) {
        ctx.describe('[karma-parallel] Fake focused test spec', function() {
          (ctx.fit || ctx.iit || ctx.it.only).call(
            ctx,
            'should prevent other tests from running',
            function() {}
          );
        });
      }
      if (!hasOwnSpecs && hasOtherSpecs) {
        ctx.describe(
          '[karma-parallel] Add single test to prevent failure',
          function() {
            (ctx.it || ctx.specify).call(
              ctx,
              'should prevent on this shard failing by having successful tests',
              function() {}
            );
          }
        );
      }
      forceDescribe = false;
    }
  };
}

initKarmaParallelizer(
  window,
  window.__karma__,
  JSON.parse('%KARMA_SHARD_INFO%')
);
