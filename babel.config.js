module.exports = function (api) {
  api.cache(true)
  return {
    "presets": [
      'module:metro-react-native-babel-preset'
    ],
    "plugins": [
      "react-native-reanimated/plugin",
      "@babel/plugin-transform-flow-strip-types",
      ["@babel/plugin-transform-private-methods", { loose: true }]
    ],
  }
}