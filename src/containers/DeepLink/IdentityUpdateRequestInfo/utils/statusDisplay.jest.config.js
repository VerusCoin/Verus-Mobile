const path = require('path');

// Isolated from the app's react-native Jest preset. That preset hoists
// jest-environment-node@29 and loads RN mocks this helper does not need.
const repoRoot = path.resolve(__dirname, '../../../../../');

module.exports = {
  rootDir: __dirname,
  testEnvironment: path.join(
    repoRoot,
    'node_modules/jest-config/node_modules/jest-environment-node',
  ),
  testMatch: ['<rootDir>/shouldShowIdentityStatusUpdate.test.js'],
};
