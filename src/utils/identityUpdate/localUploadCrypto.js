import {Buffer} from 'buffer';
import {SaplingPaymentAddress} from 'verus-typescript-primitives';
import {randomBytes} from '../crypto/randomBytes';
import {getKey} from '../keyGenerator/keyGenerator';
import {encryptData} from '../api/channels/dlight/requests/encrypt';
import {zGetEncryptionAddress} from '../api/channels/dlight/requests/zGetEncryptionAddress';
import {
  createAuthenticatedUploadDecryptor,
  createUploadOperationGuard,
} from './uploadDecryption';
import {assertSupportedIdentityUploads} from './uploadPolicy';

// The SDK caps input at 4096 items / 1 MB. Allow its encrypted leaves, MMR
// roots/hash vectors and links, while bounding operation-local key storage.
const MAX_DESCRIPTORS = 16384;
const MAX_CIPHERTEXT_BYTES = 2000000;

// Native bridge fields must decode to the exact byte length expected by the SDK.
const strictHex = (value, length) => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(value)
  ) {
    throw new Error('Invalid native identity upload crypto response.');
  }

  const result = Buffer.from(value, 'hex');

  if (result.length !== length) {
    result.fill(0);
    throw new Error('Invalid native identity upload crypto response length.');
  }

  return result;
};

// Canonical addresses let recipient approval use exact string comparisons.
const validateRecipient = address => {
  if (
    typeof address !== 'string' ||
    !address.startsWith('zs1') ||
    SaplingPaymentAddress.fromAddressString(address).toAddressString() !==
      address
  ) {
    throw new Error('Invalid native identity upload recipient.');
  }
};

// Keep private SSKs inside one build, bound to their recipient and ciphertext.
// Callers dispose in finally; every verification authenticates native ciphertext.
export const createLocalIdentityUploadCrypto = async ({
  systemId,
  request,
  assertActive,
}) => {
  assertSupportedIdentityUploads(request);

  // Private destinations come from the request; public recipients are generated
  // below and remain separate so their viewing keys can be published safely.
  const privateRecipients = new Set(
    [...(request.signDataMap?.entries() || [])]
      .map(([, upload]) => upload.encryptToAddress?.toAddressString())
      .filter(Boolean),
  );

  const publicRecipients = new Map();
  const privateKeys = new Map();
  const ephemeralKeys = new Set();
  let retainedBytes = 0;

  // Disposal and session cancellation share the same key cleanup.
  const operation = createUploadOperationGuard({
    assertActive,
    clearKeys: () => {
      privateKeys.forEach(({ssk}) => ssk.fill(0));
      privateKeys.clear();

      publicRecipients.forEach(ivk => ivk.fill(0));
      publicRecipients.clear();

      ephemeralKeys.clear();
      retainedBytes = 0;
    },
  });

  try {
    const authenticate = createAuthenticatedUploadDecryptor({
      request,
      assertActive: operation.assertActive,
      resolveKeys: (descriptor, context) => {
        if (!context.encryptToAddress) {
          if (
            !Buffer.isBuffer(descriptor.ivk) ||
            ![...publicRecipients.values()].some(ivk =>
              ivk.equals(descriptor.ivk),
            )
          ) {
            throw new Error('Unknown disposable identity upload viewing key.');
          }

          return {ivk: descriptor.ivk};
        }

        // The retained symmetric key authenticates our private ciphertext
        // without requiring the recipient's viewing key.
        const record = privateKeys.get(descriptor.epk.toString('hex'));

        if (
          !record ||
          record.recipient !== context.encryptToAddress ||
          !record.ciphertext.equals(descriptor.objectdata)
        ) {
          throw new Error(
            'No authenticated key for this identity upload ciphertext and recipient.',
          );
        }

        return {symmetricKey: record.ssk};
      },
    });

    return {
      dispose: operation.dispose,

      randomBytes: length =>
        operation.run(async () => {
          const result = await randomBytes(length);
          operation.assertActive();

          if (!Buffer.isBuffer(result) || result.length !== length) {
            throw new Error('Invalid native identity upload randomness.');
          }

          return result;
        }),

      createPublicRecipient: () =>
        operation.run(async () => {
          if (publicRecipients.size >= 4096) {
            throw new Error(
              'Cannot create another public identity upload recipient.',
            );
          }

          // Both bridges consume mnemonic words here. Never use wallet material,
          // nor pass raw random hex to an argument named mnemonicSeed.
          let mnemonicSeed = await getKey(256);
          operation.assertActive();

          let keys;

          try {
            keys = await zGetEncryptionAddress(systemId, {
              mnemonicSeed,
              returnSecret: false,
            });
          } finally {
            mnemonicSeed = undefined;
          }

          operation.assertActive();

          const address = keys.address;
          const ivk = strictHex(keys.ivk, 32);

          // Do not retain the extended viewing key returned alongside the IVK.
          keys = undefined;
          validateRecipient(address);

          if (
            publicRecipients.size >= 4096 ||
            ivk.equals(Buffer.alloc(32)) ||
            privateRecipients.has(address) ||
            publicRecipients.has(address) ||
            [...publicRecipients.values()].some(key => key.equals(ivk))
          ) {
            throw new Error(
              'Native identity upload public recipient was reused or invalid.',
            );
          }

          publicRecipients.set(address, ivk);

          return {address, ivk: Buffer.from(ivk)};
        }),

      encrypt: (plaintext, recipient) =>
        operation.run(async () => {
          const isPrivate = privateRecipients.has(recipient);

          if (!isPrivate && !publicRecipients.has(recipient)) {
            throw new Error(
              'Identity upload encryption recipient was not approved.',
            );
          }

          if (
            !Buffer.isBuffer(plaintext) ||
            !plaintext.length ||
            ephemeralKeys.size >= MAX_DESCRIPTORS ||
            retainedBytes + plaintext.length + 16 > MAX_CIPHERTEXT_BYTES
          ) {
            throw new Error(
              'Identity upload encryption exceeds the operation limit.',
            );
          }

          let native;
          let ssk;

          try {
            // plaintext is already a tagged DataDescriptor; do not wrap it again.
            native = await encryptData(
              recipient,
              plaintext.toString('hex'),
              isPrivate,
            );
            operation.assertActive();

            const epk = strictHex(native.ephemeralPublicKey, 32);
            const ciphertext = strictHex(
              native.encryptedData,
              plaintext.length + 16,
            );

            // Recheck after the native call: other descriptors may have finished
            // while this operation was awaiting encryption.
            if (
              ephemeralKeys.size >= MAX_DESCRIPTORS ||
              retainedBytes + ciphertext.length > MAX_CIPHERTEXT_BYTES
            ) {
              throw new Error(
                'Identity upload encryption exceeds the operation limit.',
              );
            }

            if (
              epk.equals(Buffer.alloc(32)) ||
              ephemeralKeys.has(epk.toString('hex'))
            ) {
              throw new Error(
                'Native identity upload ephemeral key was reused or invalid.',
              );
            }

            if (isPrivate) ssk = strictHex(native.symmetricKey, 32);

            ephemeralKeys.add(epk.toString('hex'));
            retainedBytes += ciphertext.length;

            if (ssk) {
              privateKeys.set(epk.toString('hex'), {
                recipient,
                ciphertext: Buffer.from(ciphertext),
                ssk,
              });
              ssk = undefined; // now owned and cleared by operation.dispose
            }

            return {epk, ciphertext};
          } finally {
            // Clear a key that was not transferred to the operation's key map.
            ssk?.fill(0);
            if (native) native.symmetricKey = undefined;
          }
        }),

      decryptData: (descriptor, context) =>
        operation.run(() => authenticate(descriptor, context)),
    };
  } catch (error) {
    operation.dispose(error);
    throw error;
  }
};
