// jshint node:true
'use strict';

const _ = require('lodash');
const istanbulUtils = require('istanbul/lib/object-utils');

function createAggregateReporter(reporterKey) {
	const UNSTARTED = {};

    const AggregatedCoverageReporter = function(injector, config) {
    	// Create the original reporter
		const innerReporter = injector.get(reporterKey);
		let aggregatedBrowserState;
			
		const callThrough = _.rest((name, args) => {
			if (_.isFunction(innerReporter[name])) {
				innerReporter[name].apply(innerReporter, args);
			}
		});

		const getAlias = (browser) => ({
			// TODO: Do we need to add any additional props to the Browser interface? 	
			name: browser.name,
			id: config.browserIdAlias[browser.name]
		});

		const getStartedBrowserCount = (aggregate) =>
			 _.chain(aggregate.real)
				.filter((browser) => browser === UNSTARTED)
				.size()
				.value();
		
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

		this.onRunStart = function() {
			aggregatedBrowserState = {};
			callThrough('onRunStart');
		};

		this.onBrowserStart = function(browser) {
			const aggregate = aggregatedBrowserState[browser.name] = 
				aggregatedBrowserState[browser.name] || 
				{alias: getAlias(browser), real: {}};

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
				// TODO: Does result have any other info that needs to be aggregated or removed?
				callThrough('onSpecComplete', aggregate.alias, result);
			}
		};

		this.onBrowserComplete = function(browser, result) {
			// We need to keep track of the completed browsers and call through
			// only when all are complete for the given cluster
			const aggregate = aggregatedBrowserState[browser.name];
			if (aggregate) {
				aggregate.real[browser.id] = result;
				if (getFinishedBrowserCount(aggregate) === config.executors) {
					const coverage = combineBrowserResults(aggregate);
					// TODO: Do we need to pass additional result data besides coverage? 
					callThrough('onBrowserComplete', aggregate.alias, {coverage});
				}
			}
		};


		this.onRunComplete = function(browsers, results) {
			var browsersArray = [];
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
			callThrough('onRunComplete', aggregatedBrowsers, results);
		};

		this.onExit = function(done) {
			callThrough('onExit', done);
		};
    };

    AggregatedCoverageReporter.$inject = ['injector', 'config.parallelOptions'];
    return AggregatedCoverageReporter;
}

exports.createAggregateReporter = createAggregateReporter;
