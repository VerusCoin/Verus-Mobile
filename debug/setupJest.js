const mockVerusLightClient = require('../__mocks__/react-native-verus-light-client/mock');
const mockRnAlertAsync = require('../__mocks__/react-native-alert-async/mock');
const mockRedux = require('../__mocks__/redux/mock');

jest.mock('react-native-verus-light-client', () => mockVerusLightClient(), {
  virtual: true,
});
jest.mock('react-native-verus', () => ({
  Tools: {
    bech32Decode: jest.fn(value => Promise.resolve(value)),
    decryptVerusData: jest.fn(() => Promise.resolve('')),
    deriveSaplingSpendingKey: jest.fn(value => Promise.resolve(value)),
    deriveShieldedAddress: jest.fn(() => Promise.resolve('')),
    deriveViewingKey: jest.fn(() => Promise.resolve('')),
    deterministicSeedBytes: jest.fn(value => Promise.resolve(value)),
    encryptVerusData: jest.fn(() => Promise.resolve('')),
    getVerusEncryptionAddress: jest.fn(() => Promise.resolve({})),
  },
  SaplingSpendingKey: jest.fn(),
  SpendInfo: jest.fn(),
  InitializerConfig: jest.fn(),
  getSynchronizerInstance: jest.fn(() => ({
    getBlockCount: jest.fn(() => Promise.resolve(0)),
    getInfo: jest.fn(() => Promise.resolve({})),
    getPrivateBalance: jest.fn(() => Promise.resolve(0)),
    getTransactions: jest.fn(() => Promise.resolve([])),
    getUnspent: jest.fn(() => Promise.resolve([])),
    sendPrivateTransaction: jest.fn(() => Promise.resolve({})),
    stopAndDeleteWallet: jest.fn(() => Promise.resolve()),
  })),
  makeSynchronizer: jest.fn(() => Promise.resolve({})),
  stopAndDeleteWallet: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-nfc-manager', () => {
  const Ndef = require('react-native-nfc-manager/ndef-lib');

  return {
    __esModule: true,
    default: {
      isSupported: jest.fn(() => Promise.resolve(false)),
      isEnabled: jest.fn(() => Promise.resolve(false)),
      start: jest.fn(() => Promise.resolve()),
      requestTechnology: jest.fn(() => Promise.resolve()),
      cancelTechnologyRequest: jest.fn(() => Promise.resolve()),
      ndefHandler: {
        getNdefStatus: jest.fn(),
        getNdefMessage: jest.fn(),
        writeNdefMessage: jest.fn(),
        makeReadOnly: jest.fn(),
      },
      ndefFormatableHandlerAndroid: {
        formatNdef: jest.fn(),
      },
    },
    Ndef,
    NdefStatus: {
      NotSupported: 1,
      ReadWrite: 2,
      ReadOnly: 3,
    },
    NfcAdapter: {
      FLAG_READER_NFC_A: 0x1,
      FLAG_READER_NFC_B: 0x2,
      FLAG_READER_NFC_F: 0x4,
      FLAG_READER_NFC_V: 0x8,
      FLAG_READER_NFC_BARCODE: 0x10,
      FLAG_READER_NO_PLATFORM_SOUNDS: 0x20,
    },
    NfcTech: {
      Ndef: 'Ndef',
      NdefFormatable: 'NdefFormatable',
    },
  };
});
jest.mock('react-native-alert-async', () => mockRnAlertAsync());
jest.mock('redux', () => mockRedux());
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-crypto', () => require('crypto'));
jest.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY:
      'AccessibleWhenPasscodeSetThisDeviceOnly',
  },
  SECURITY_LEVEL: {
    SECURE_HARDWARE: 'SECURE_HARDWARE',
    SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    ANY: 'ANY',
  },
  getSecurityLevel: jest.fn(() => Promise.resolve('SECURE_HARDWARE')),
  getSupportedBiometryType: jest.fn(() => Promise.resolve(null)),
  getAllGenericPasswordServices: jest.fn(() => Promise.resolve([])),
  setGenericPassword: jest.fn(() => Promise.resolve('mockPass')),
  getGenericPassword: jest.fn(() => Promise.resolve('mockPass')),
  resetGenericPassword: jest.fn(() => Promise.resolve(null)),
  setInternetCredentials: jest.fn(() => Promise.resolve('mockPass')),
  getInternetCredentials: jest.fn(() => Promise.resolve('mockPass')),
  resetInternetCredentials: jest.fn(() => Promise.resolve(null)),
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
        return Buffer.alloc(length);
      } else {
        cb(null, Buffer.alloc(length));
      }
    },
  };
});

const {NativeModules} = require('react-native');
NativeModules.VerusBiometricEnrollment = {
  getEnrollmentBoundCredentialStatus: jest.fn(() => Promise.resolve('VALID')),
  setEnrollmentBoundCredential: jest.fn(() => Promise.resolve(true)),
  getEnrollmentBoundCredential: jest.fn(() =>
    Promise.resolve('mock-biometric-credential'),
  ),
  removeEnrollmentBoundCredential: jest.fn(() => Promise.resolve(true)),
};
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

global.fetch = require('../__mocks__/react-native-fetch/fetch');

// App functionality
global.ENABLE_VERUS_IDENTITIES = true;
global.DISABLED_CHANNELS = ['dlight'];
global.ENABLE_DLIGHT = !global.DISABLED_CHANNELS.includes('dlight');
