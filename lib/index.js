'use strict';

// jshint node: true

const parallel = {
  'framework:parallel': ['type', require('./framework')],
  'middleware:parallel': ['factory', require('./middleware')]
};

module.exports = Object.assign({}, /*coverage, */parallel);
