module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      '@babel/plugin-transform-flow-strip-types',
      ['@babel/plugin-transform-private-methods', {loose: true}],
      'react-native-reanimated/plugin',
    ],
  };
};
