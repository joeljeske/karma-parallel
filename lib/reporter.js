// jshint node:true
'use strict';

const _ = require('lodash');
const istanbulUtils = require('istanbul/lib/object-utils');

const UNSTARTED = {};

class AggegatedBrowserLastResult {
  constructor() {
    this._realLastResults = {};
  }
  get total() {
    return _.sum(
      _.map(this._realLastResults, 'total')
    );
  }
  get failed() {
    return _.sum(
      _.map(this._realLastResults, 'failed')
    );
  }
  get netTime() {
    return _.max(
      _.map(this._realLastResults, 'netTime')
    );
  }
  get disconnected() {
    return _.some(
      _.map(this._realLastResults, 'disconnected')
    );
  }
  get error() {
    return _.some(
      _.map(this._realLastResults, 'error')
    );
  }
}

const AggregatedCoverageReporter = function(injector, logger, config, baseReporterDecorator, formatError) {
  baseReporterDecorator(this);
  const log = logger.create('reporter:parallel-coverage');
  // Create the original reporters
  const locals = {
    baseReporterDecorator: ['value', baseReporterDecorator],
    formatError: ['value', formatError]
  };
  const reporters = config.coverageReporters
    .map((name) => {
      log.debug(`instantiating reporter:${name}`);
      return {
        name,
        reporter: injector.createChild([locals], [`reporter:${name}`]).get(`reporter:${name}`)
      };
    });
  let aggregatedBrowserState;

  const callThrough = _.rest((fnName, args) => {
    reporters.forEach(({name, reporter}) => {
      if (_.isFunction(reporter[fnName])) {
        log.debug(`relaying ${fnName}() on reporter:${name}`);
        reporter[fnName].apply(reporter, args);
      }
    });
  });

  const getAlias = (browser) => ({
    // TODO: Do we need to add any additional props to the Browser interface?
    name: browser.name,
    fullName: browser.fullName,
    id: config.browserIdAlias[browser.name],
    lastResult: new AggegatedBrowserLastResult()
  });

  const getStartedBrowserCount = (aggregate) =>
    _.size(aggregate.real);

  const getFinishedBrowserCount = (aggregate) =>
    _.chain(aggregate.real)
      .reject((browser) => browser === UNSTARTED)
      .size()
      .value();

  const coverageCombiner = (a, b) => {
    if (a && b) return istanbulUtils.mergeFileCoverage(a, b);
    if (a) return a;
    if (b) return b;
    throw new Error('attempted to combine coverage from 2 null sources');
  };
  const combineBrowserResults = (aggregate) => {
    const coverages = _.map(aggregate.real, 'coverage');
    const args = [{}].concat(coverages, coverageCombiner);
    return _.extendWith.apply(_, args);
  };

  this.onRunStart = function(browsers) {
    aggregatedBrowserState = {};
    // Browsers will be an empty collection on newer versions of karma
    callThrough('onRunStart', browsers);
  };

  this.onBrowserStart = function(browser) {
    const aggregate = aggregatedBrowserState[browser.name] =
      aggregatedBrowserState[browser.name] ||
      {alias: getAlias(browser), real: {}};

    delete aggregate.alias.lastResult._realLastResults[browser.id];
    aggregate.real[browser.id] = UNSTARTED;

    // Call through on the very first browser start
    if (getStartedBrowserCount(aggregate) === 1) {
      callThrough('onBrowserStart', aggregate.alias);
    }
  };

  this.onSpecComplete = function (browser, result) {
    // We can passthrough this call multiple times for each browser
    const aggregate = aggregatedBrowserState[browser.name];
    if (aggregate) {
      aggregate.alias.lastResult._realLastResults[browser.id] = browser.lastResult;
      // TODO: Does result have any other info that needs to be aggregated or removed?
      callThrough('onSpecComplete', aggregate.alias, result);
    }
  };

  this.onBrowserComplete = function(browser, result) {
    // We need to keep track of the completed browsers and call through
    // only when all are complete for the given cluster
    const aggregate = aggregatedBrowserState[browser.name];
    if (aggregate) {
      aggregate.alias.lastResult._realLastResults[browser.id] = browser.lastResult;
      aggregate.real[browser.id] = result;
      if (getFinishedBrowserCount(aggregate) === config.executors) {
        const coverage = combineBrowserResults(aggregate);
        // TODO: Do we need to pass additional result data besides coverage?
        callThrough('onBrowserComplete', aggregate.alias, {coverage});
      }
    }
  };


  this.onRunComplete = function(browsers, results) {
    const browsersArray = [];
    // We get a Collection, not a real array so lodash fails
    browsers.forEach((b) => browsersArray.push(b));
    // Get a distinct list of alias'ed browsers and call through with the results
    const aggregatedBrowsers = _.chain(browsersArray)
      .map('name')
      .uniq()
      .map((name) => aggregatedBrowserState[name])
      .filter()
      .map('alias')
      .value();
    // Reset out state after completion
    aggregatedBrowserState = {};
    callThrough('onRunComplete', aggregatedBrowsers, results);
  };

  this.onExit = function(done) {
    // We cannot call callThrough here as we must determine when all relevant reporters have called done()
    const promises = reporters.map(({name, reporter}) => new Promise((resolve) => {
      if (_.isFunction(reporter.onExit)) {
        log.debug(`relaying done() on reporter:${name}`);
        reporter.onExit(() => resolve());
      } else {
        resolve();
      }
    }));

    Promise.all(promises).then(() => done());
  };
};

AggregatedCoverageReporter.$inject = ['injector', 'logger', 'config.parallelOptions', 'baseReporterDecorator', 'formatError'];
module.exports = AggregatedCoverageReporter;
