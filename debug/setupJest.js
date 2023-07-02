const mockVerusLightClient = require('../__mocks__/react-native-verus-light-client/mock')
const mockRnAlertAsync = require('../__mocks__/react-native-alert-async/mock')
const mockRedux = require('../__mocks__/redux/mock')

jest.mock('react-native-verus-light-client', () => mockVerusLightClient());
jest.mock('react-native-alert-async', () => mockRnAlertAsync());
jest.mock('redux', () => mockRedux());
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-crypto', () =>
  require('crypto')
);
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve('mockPass')),
  getGenericPassword: jest.fn(() => Promise.resolve('mockPass')),
  resetGenericPassword: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('react-native-fs', () => {
  return {
    mkdir: jest.fn(),
    moveFile: jest.fn(),
    copyFile: jest.fn(),
    pathForBundle: jest.fn(),
    pathForGroup: jest.fn(),
    getFSInfo: jest.fn(),
    getAllExternalFilesDirs: jest.fn(),
    unlink: jest.fn(),
    exists: jest.fn(),
    stopDownload: jest.fn(),
    resumeDownload: jest.fn(),
    isResumable: jest.fn(),
    stopUpload: jest.fn(),
    completeHandlerIOS: jest.fn(),
    readDir: jest.fn(),
    readDirAssets: jest.fn(),
    existsAssets: jest.fn(),
    readdir: jest.fn(),
    setReadable: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    read: jest.fn(),
    readFileAssets: jest.fn(),
    hash: jest.fn(),
    copyFileAssets: jest.fn(),
    copyFileAssetsIOS: jest.fn(),
    copyAssetsVideoIOS: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    write: jest.fn(),
    downloadFile: jest.fn(),
    uploadFiles: jest.fn(),
    touch: jest.fn(),
    MainBundlePath: jest.fn(),
    CachesDirectoryPath: jest.fn(),
    DocumentDirectoryPath: jest.fn(),
    ExternalDirectoryPath: jest.fn(),
    ExternalStorageDirectoryPath: jest.fn(),
    TemporaryDirectoryPath: jest.fn(),
    LibraryDirectoryPath: jest.fn(),
    PicturesDirectoryPath: jest.fn(),
  };
});
jest.mock('react-native-randombytes', () => {
  return {
    randomBytes: (length, cb) => {
      if (!cb) {
        return Buffer.alloc(length)
      } else {
        cb(null, Buffer.alloc(length))
      }
    }
  };
});
jest.mock('react-native-iphone-x-helper', () => {
  return {
    isIphoneX: jest.fn(),
    ifIphoneX: jest.fn(),
    getStatusBarHeight: jest.fn(),
    getBottomSpace: jest.fn(),
  };
});
jest.mock('react-native-haptic-feedback', () => {
  return {
    trigger: jest.fn(),
  };
});
jest.mock('@react-native-community/netinfo', () => {
  return {
    getCurrentConnectivity: jest.fn(),
    isConnectionMetered: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    isConnected: {
      fetch: () => {
        return Promise.resolve(true);
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  };
});
jest.mock('ethers', () => require('ethers/dist/ethers.umd'));
jest.mock('react-native-url-polyfill', () => require('url'));

global.fetch = require('../__mocks__/react-native-fetch/fetch')

// App functionality
global.ENABLE_VERUS_IDENTITIES = true;
global.DISABLED_CHANNELS = ['dlight'];
global.ENABLE_DLIGHT = !global.DISABLED_CHANNELS.includes('dlight')

