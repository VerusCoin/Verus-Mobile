import {
  WalletBackup,
  WalletBackupOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {
  SEED_DETAILS_ENCRYPTION_ITERATION_OPTIONS,
  SEED_DETAILS_ENCRYPTION_ITERS,
  SEED_DETAILS_ENCRYPTION_ITERS_HIGH,
  SEED_DETAILS_ENCRYPTION_ITERS_LOW,
  SEED_DETAILS_ENCRYPTION_ITERS_MEDIUM,
  SEED_DETAILS_MNEMONIC_WORDS,
  buildSeedDetails,
  getMnemonicEntropyBuffer,
  isValid24WordBip39Mnemonic,
  seedDetailsOrdinalToMnemonic,
  seedDetailsRequiresPassword,
} from '../seedDetails/seedDetails';

export const WALLET_BACKUP_NDEF_MIME = 'application/x-vrsc-wallet.backup';
export const WALLET_BACKUP_ENCRYPTION_ITERS_LOW =
  SEED_DETAILS_ENCRYPTION_ITERS_LOW;
export const WALLET_BACKUP_ENCRYPTION_ITERS_MEDIUM =
  SEED_DETAILS_ENCRYPTION_ITERS_MEDIUM;
export const WALLET_BACKUP_ENCRYPTION_ITERS_HIGH =
  SEED_DETAILS_ENCRYPTION_ITERS_HIGH;
export const WALLET_BACKUP_ENCRYPTION_ITERS =
  SEED_DETAILS_ENCRYPTION_ITERS;
export const WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS =
  SEED_DETAILS_ENCRYPTION_ITERATION_OPTIONS;
export const WALLET_BACKUP_MNEMONIC_WORDS = SEED_DETAILS_MNEMONIC_WORDS;

export const walletBackupRequiresPassword = walletBackupOrdinal => {
  return seedDetailsRequiresPassword(walletBackupOrdinal);
};

export const walletBackupOrdinalToMnemonic = ({
  walletBackupOrdinal,
  password,
}) => {
  return seedDetailsOrdinalToMnemonic({
    seedDetailsOrdinal: walletBackupOrdinal,
    ExpectedOrdinalClass: WalletBackupOrdinalVDXFObject,
    password,
    invalidMessage: 'NFC card does not contain a valid wallet backup.',
    passwordRequiredMessage:
      'This wallet backup is encrypted. Enter the backup password.',
    decryptErrorMessage:
      'Unable to decrypt wallet backup. Check the backup password and try again.',
  });
};

export const buildWalletBackupOrdinal = async ({
  mnemonic,
  password,
  kdfIters = WALLET_BACKUP_ENCRYPTION_ITERS,
}) => {
  const backup = await buildSeedDetails({
    SeedDetailsClass: WalletBackup,
    mnemonic,
    password,
    kdfIters,
  });

  return new WalletBackupOrdinalVDXFObject({data: backup});
};

export {
  getMnemonicEntropyBuffer,
  isValid24WordBip39Mnemonic,
};
