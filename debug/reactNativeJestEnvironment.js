'use strict';

const JestNodeEnv = require('jest-environment-node');
const NodeEnv = JestNodeEnv.TestEnvironment || JestNodeEnv;

module.exports = class ReactNativeJestEnvironment extends NodeEnv {
  exportConditions() {
    return ['react-native'];
  }
};
