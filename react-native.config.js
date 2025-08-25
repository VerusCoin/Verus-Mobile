module.exports = {
  dependencies: {
    "react-native-flipper": {
      platforms: {
        ios: null // disable Android platform, other platforms will still autolink if provided
      }
    },
    "react-native-verus-light-client": {
      platforms: {
        android: null // disable Android platform, other platforms will still autolink if provided
      }
    }
  },
  assets: [
    "./assets/fonts/"
  ],
}