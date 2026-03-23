const { getDefaultConfig } = require("metro-config");

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();

  return {
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      minifierPath: require("path").resolve("./dummy-minifier"),
      minifierConfig: {
        mangle: {
          toplevel: true,
          reserved: ['BigInteger', 'ECPair', 'Point'],
        },
      },
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg', 'cjs'],
      extraNodeModules: {
        crypto: require.resolve('react-native-crypto'),
        path: require.resolve('path-browserify'),
        stream: require.resolve('stream-browserify'),
        process: require.resolve('process')
      },
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === 'axios') {
          return {
            filePath: require.resolve('axios/dist/browser/axios.cjs'),
            type: 'sourceFile',
          };
        }
        return context.resolveRequest(context, moduleName, platform);
      },
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === 'axios') {
          return {
            filePath: require.resolve('axios/dist/browser/axios.cjs'),
            type: 'sourceFile',
          };
        }
        return context.resolveRequest(context, moduleName, platform);
      },
    },
  };
})();
