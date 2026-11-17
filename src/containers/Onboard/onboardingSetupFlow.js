import {isValid24WordBip39Mnemonic} from '../../utils/walletBackup/walletBackup';

export const SETUP_PATHS = {
  CREATE: 'create',
  IMPORT: 'import',
};

export const IMPORT_METHODS = {
  SEED: 'seed',
  QR: 'qr',
  TEXT: 'text',
  NFC: 'nfc',
};

const IMPORT_METHOD_VALUES = Object.values(IMPORT_METHODS);

export const normalizeSetupSelection = selection => {
  const setupPath = selection?.setupPath;
  const importMethod = selection?.importMethod;

  if (
    setupPath === SETUP_PATHS.IMPORT &&
    IMPORT_METHOD_VALUES.includes(importMethod)
  ) {
    return {
      setupPath: SETUP_PATHS.IMPORT,
      importMethod,
    };
  }

  return {
    setupPath: SETUP_PATHS.CREATE,
    importMethod: null,
  };
};

export const shouldOfferImportShieldedRestore = seed =>
  isValid24WordBip39Mnemonic(seed);
