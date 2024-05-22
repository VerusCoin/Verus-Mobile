const { getDefaultConfig } = require("metro-config");

module.exports = (async () => {
  const {
    resolver: {sourceExts, assetExts},
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
      sourceExts: [...sourceExts, 'svg'],
      extraNodeModules: {
        stream: require.resolve('readable-stream'),
        crypto: require.resolve('react-native-crypto'),
    }
    },
  };
})();
