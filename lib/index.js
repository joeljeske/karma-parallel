'use strict';

// jshint node: true

module.exports = {
  'framework:parallel': ['type', require('./framework')],
  'middleware:parallel': ['factory', require('./middleware')]
};
