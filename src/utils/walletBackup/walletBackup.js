import {Buffer} from 'buffer';
import {entropyToMnemonic, mnemonicToEntropy, validateMnemonic} from 'bip39';
import {BN} from 'bn.js';
import {
  WalletBackup,
  WalletBackupOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {saltedDecryptToBuffer, saltedEncrypt} from '../crypto/crypto';

export const WALLET_BACKUP_NDEF_MIME = 'application/x-vrsc-wallet.backup';
export const WALLET_BACKUP_ENCRYPTION_ITERS = 600000;
export const WALLET_BACKUP_MNEMONIC_WORDS = 24;

export const isValid24WordBip39Mnemonic = mnemonic => {
  if (typeof mnemonic !== 'string') return false;

  const normalized = mnemonic.trim().replace(/\s+/g, ' ');

  return (
    normalized.split(' ').length === WALLET_BACKUP_MNEMONIC_WORDS &&
    validateMnemonic(normalized)
  );
};

export const getMnemonicEntropyBuffer = mnemonic => {
  const normalized = mnemonic.trim().replace(/\s+/g, ' ');

  if (!isValid24WordBip39Mnemonic(normalized)) {
    throw new Error('Wallet seed must be a valid 24 word BIP39 mnemonic.');
  }

  return Buffer.from(mnemonicToEntropy(normalized), 'hex');
};

export const entropyBufferToMnemonic = entropy => {
  const entropyBuffer = Buffer.from(entropy);

  if (entropyBuffer.length !== 32) {
    throw new Error('Wallet backup must contain 32 bytes of BIP39 entropy.');
  }

  const mnemonic = entropyToMnemonic(entropyBuffer.toString('hex'));

  if (!isValid24WordBip39Mnemonic(mnemonic)) {
    throw new Error('Wallet backup does not contain a valid 24 word BIP39 seed.');
  }

  return mnemonic;
};

export const walletBackupRequiresPassword = walletBackupOrdinal => {
  const backup = walletBackupOrdinal && walletBackupOrdinal.data;

  return (
    backup != null &&
    (backup.isEncrypted() || backup.usesSaltedTaggedAes256Gcm())
  );
};

export const walletBackupOrdinalToMnemonic = ({
  walletBackupOrdinal,
  password,
}) => {
  const backup = walletBackupOrdinal && walletBackupOrdinal.data;

  if (
    !(walletBackupOrdinal instanceof WalletBackupOrdinalVDXFObject) ||
    backup == null ||
    !backup.isValid()
  ) {
    throw new Error('NFC card does not contain a valid wallet backup.');
  }

  if (!backup.isBIP39()) {
    throw new Error('Only BIP39 wallet backups can be imported.');
  }

  if (backup.isEncrypted() || backup.usesSaltedTaggedAes256Gcm()) {
    if (!backup.usesSaltedTaggedAes256Gcm()) {
      throw new Error('Unsupported wallet backup encryption format.');
    }

    if (!backup.containsKDFIters() || backup.KDFIters.toNumber() <= 0) {
      throw new Error('Encrypted wallet backup is missing KDF iteration metadata.');
    }

    if (password == null || password.length === 0) {
      throw new Error('This wallet backup is encrypted. Enter the backup password.');
    }

    let entropy;

    try {
      entropy = saltedDecryptToBuffer(
        password,
        backup.data.toString('base64'),
        backup.KDFIters.toNumber(),
      );
    } catch (e) {
      throw new Error('Unable to decrypt wallet backup. Check the backup password and try again.');
    }

    return entropyBufferToMnemonic(entropy);
  }

  if (!backup.encryptionFormat.eq(WalletBackup.ENCRYPTION_FORMAT_NONE)) {
    throw new Error('Unsupported wallet backup encryption format.');
  }

  return entropyBufferToMnemonic(backup.data);
};

export const buildWalletBackupOrdinal = async ({mnemonic, password}) => {
  const entropy = getMnemonicEntropyBuffer(mnemonic);
  const encrypted = password != null && password.length > 0;
  let data = entropy;
  let encryptionFormat = WalletBackup.ENCRYPTION_FORMAT_NONE;
  let KDFIters = new BN(0, 10);

  if (encrypted) {
    const encryptedBackup = await saltedEncrypt(
      password,
      entropy,
      WALLET_BACKUP_ENCRYPTION_ITERS,
    );

    data = Buffer.from(encryptedBackup, 'base64');
    encryptionFormat = WalletBackup.ENCRYPTION_FORMAT_SALTED_TAGGED_AES_256_GCM;
    KDFIters = new BN(WALLET_BACKUP_ENCRYPTION_ITERS, 10);
  }

  const backup = new WalletBackup({
    data,
    seedFormat: WalletBackup.SEED_FORMAT_BIP39,
    encryptionFormat,
    KDFIters,
    flags: new BN(0, 10),
    encrypted,
    containsKDFIters: encrypted,
  });

  if (!backup.isValid()) {
    throw new Error('Failed to create a valid wallet backup payload.');
  }

  return new WalletBackupOrdinalVDXFObject({data: backup});
};
