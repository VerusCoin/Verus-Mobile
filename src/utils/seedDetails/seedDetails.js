import {Buffer} from 'buffer';
import {entropyToMnemonic, mnemonicToEntropy, validateMnemonic} from 'bip39';
import {BN} from 'bn.js';
import {saltedDecryptToBuffer, saltedEncrypt} from '../crypto/crypto';

export const SEED_DETAILS_ENCRYPTION_ITERS_LOW = 100000;
export const SEED_DETAILS_ENCRYPTION_ITERS_MEDIUM = 300000;
export const SEED_DETAILS_ENCRYPTION_ITERS_HIGH = 600000;
export const SEED_DETAILS_ENCRYPTION_ITERS =
  SEED_DETAILS_ENCRYPTION_ITERS_HIGH;
export const SEED_DETAILS_ENCRYPTION_ITERATION_OPTIONS = [
  {
    key: 'low',
    label: 'Low',
    iterations: SEED_DETAILS_ENCRYPTION_ITERS_LOW,
  },
  {
    key: 'medium',
    label: 'Medium',
    iterations: SEED_DETAILS_ENCRYPTION_ITERS_MEDIUM,
  },
  {
    key: 'high',
    label: 'High',
    iterations: SEED_DETAILS_ENCRYPTION_ITERS_HIGH,
  },
];
export const SEED_DETAILS_MNEMONIC_WORDS = 24;

export const isValid24WordBip39Mnemonic = mnemonic => {
  if (typeof mnemonic !== 'string') return false;

  const normalized = mnemonic.trim().replace(/\s+/g, ' ');

  return (
    normalized.split(' ').length === SEED_DETAILS_MNEMONIC_WORDS &&
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
    throw new Error('Seed details must contain 32 bytes of BIP39 entropy.');
  }

  const mnemonic = entropyToMnemonic(entropyBuffer.toString('hex'));

  if (!isValid24WordBip39Mnemonic(mnemonic)) {
    throw new Error('Seed details do not contain a valid 24 word BIP39 seed.');
  }

  return mnemonic;
};

export const seedDetailsRequiresPassword = seedDetailsOrdinal => {
  const seedDetails = seedDetailsOrdinal && seedDetailsOrdinal.data;

  return (
    seedDetails != null &&
    (seedDetails.isEncrypted() || seedDetails.usesSaltedTaggedAes256Gcm())
  );
};

export const validateSeedDetails = (
  seedDetails,
  {
    invalidMessage = 'Invalid seed details.',
    unsupportedSeedMessage = 'Only BIP39 seed details are supported.',
  } = {},
) => {
  if (seedDetails == null || !seedDetails.isValid()) {
    throw new Error(invalidMessage);
  }

  if (!seedDetails.isBIP39()) {
    throw new Error(unsupportedSeedMessage);
  }

  if (
    seedDetails.isEncrypted() ||
    seedDetails.usesSaltedTaggedAes256Gcm()
  ) {
    if (!seedDetails.usesSaltedTaggedAes256Gcm()) {
      throw new Error('Unsupported seed details encryption format.');
    }

    if (
      !seedDetails.containsKDFIters() ||
      seedDetails.KDFIters.toNumber() <= 0
    ) {
      throw new Error('Encrypted seed details are missing KDF iteration metadata.');
    }
  } else if (
    !seedDetails.encryptionFormat.eq(seedDetails.constructor.ENCRYPTION_FORMAT_NONE)
  ) {
    throw new Error('Unsupported seed details encryption format.');
  }
};

export const seedDetailsOrdinalToMnemonic = ({
  seedDetailsOrdinal,
  ExpectedOrdinalClass,
  password,
  invalidMessage = 'Payload does not contain valid seed details.',
  passwordRequiredMessage = 'These seed details are encrypted. Enter the password.',
  decryptErrorMessage = 'Unable to decrypt seed details. Check the password and try again.',
}) => {
  const seedDetails = seedDetailsOrdinal && seedDetailsOrdinal.data;

  if (
    ExpectedOrdinalClass != null &&
    !(seedDetailsOrdinal instanceof ExpectedOrdinalClass)
  ) {
    throw new Error(invalidMessage);
  }

  validateSeedDetails(seedDetails, {invalidMessage});

  if (seedDetails.isEncrypted() || seedDetails.usesSaltedTaggedAes256Gcm()) {
    if (password == null || password.length === 0) {
      throw new Error(passwordRequiredMessage);
    }

    let entropy;

    try {
      entropy = saltedDecryptToBuffer(
        password,
        seedDetails.data.toString('base64'),
        seedDetails.KDFIters.toNumber(),
      );
    } catch (e) {
      throw new Error(decryptErrorMessage);
    }

    return entropyBufferToMnemonic(entropy);
  }

  return entropyBufferToMnemonic(seedDetails.data);
};

export const buildSeedDetails = async ({
  SeedDetailsClass,
  mnemonic,
  password,
  kdfIters = SEED_DETAILS_ENCRYPTION_ITERS,
}) => {
  const entropy = getMnemonicEntropyBuffer(mnemonic);
  const encrypted = password != null && password.length > 0;
  const parsedKdfIters = Number(kdfIters);
  let data = entropy;
  let encryptionFormat = SeedDetailsClass.ENCRYPTION_FORMAT_NONE;
  let KDFIters = new BN(0, 10);

  if (encrypted) {
    if (!Number.isInteger(parsedKdfIters) || parsedKdfIters <= 0) {
      throw new Error('Seed details encryption iterations must be a positive integer.');
    }

    const encryptedSeedDetails = await saltedEncrypt(
      password,
      entropy,
      parsedKdfIters,
    );

    data = Buffer.from(encryptedSeedDetails, 'base64');
    encryptionFormat =
      SeedDetailsClass.ENCRYPTION_FORMAT_SALTED_TAGGED_AES_256_GCM;
    KDFIters = new BN(parsedKdfIters, 10);
  }

  const seedDetails = new SeedDetailsClass({
    data,
    seedFormat: SeedDetailsClass.SEED_FORMAT_BIP39,
    encryptionFormat,
    KDFIters,
    flags: new BN(0, 10),
    encrypted,
    containsKDFIters: encrypted,
  });

  if (!seedDetails.isValid()) {
    throw new Error('Failed to create valid seed details.');
  }

  return seedDetails;
};
