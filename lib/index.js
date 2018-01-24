'use strict';

// jshint node: true
let coverage;
try { coverage = require('karma-coverage'); } catch (er) { coverage = {}}

const parallel = {
  'framework:parallel': ['type', require('./framework')],
  'middleware:parallel': ['factory', require('./middleware')]
};

if (coverage['reporter:coverage']) {
  parallel['reporter:coverage'] = ['type', require('./reporter')];
}

module.exports = Object.assign({}, coverage, parallel);
