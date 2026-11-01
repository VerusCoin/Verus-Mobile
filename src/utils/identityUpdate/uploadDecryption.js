import {Buffer} from 'buffer';
import {
  BufferDataVdxfObject,
  DataDescriptor,
  DataDescriptorKey,
} from 'verus-typescript-primitives';
import store from '../../store';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../actions/actions/updates/sessionRequests';
import {decryptData} from '../api/channels/dlight/requests/decrypt';
import {
  assertCanonicalUploadDescriptor,
  assertSupportedIdentityUploads,
} from './uploadPolicy';

const bytes = (value, size, label) => {
  if (!Buffer.isBuffer(value) || value.length !== size) {
    throw new Error(`Invalid identity upload ${label}.`);
  }
  return value.toString('hex');
};

// Both native bridges hex-decode IVK/EPK without changing their byte order and
// hex-encode the complete result of authenticated ChaCha20-Poly1305 decryption.
// Descriptor buffers already use that order (unlike display-form uint256s).
const authenticatedUploadBytes = value => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(value)
  ) {
    throw new Error('Invalid authenticated identity upload plaintext.');
  }
  return Buffer.from(value, 'hex');
};

// All native awaits are tied to the account session and the caller's operation.
// Subscription disposal also clears retained keys if the screen is idle when
// the user switches accounts. The callback itself must not throw into Redux.
export const createUploadOperationGuard = ({
  assertActive,
  clearKeys = () => {},
} = {}) => {
  const scope = captureSessionScope(store.getState());
  let closed;
  let unsubscribe;

  const dispose = reason => {
    if (closed) return;
    closed =
      reason instanceof Error
        ? reason
        : new Error('Identity upload operation has been disposed.');
    clearKeys();
    unsubscribe?.();
    unsubscribe = undefined;
  };

  const check = () => {
    if (closed) throw closed;
    try {
      if (
        !scope.accountHash ||
        !sessionScopeIsCurrent(store.getState(), scope)
      ) {
        throw Object.assign(
          new Error('Account changed. Review the identity update again.'),
          {code: 'SESSION_CHANGED'},
        );
      }
      assertActive?.();
    } catch (error) {
      dispose(error);
      throw error;
    }
  };

  check();
  unsubscribe = store.subscribe(() => {
    try {
      check();
    } catch (_) {
      /* disposed by check */
    }
  });

  const run = async operation => {
    try {
      check();
      const result = await operation();
      check();
      return result;
    } catch (error) {
      dispose(error);
      throw error;
    }
  };

  return {assertActive: check, run, dispose};
};

// Public IVKs and transient private-upload SSKs use the same authenticated parser.
// resolveKeys returns native key parameters, never plaintext.
export const createAuthenticatedUploadDecryptor = ({
  request,
  assertActive,
  resolveKeys,
}) => {
  assertSupportedIdentityUploads(request);
  const recipients = new Map(
    [...(request.signDataMap?.entries() || [])].map(([key, upload]) => [
      key.toAddress(),
      upload.encryptToAddress?.toAddressString(),
    ]),
  );

  return async (descriptor, context) => {
    assertActive();
    assertCanonicalUploadDescriptor(descriptor);
    if (
      !context ||
      !recipients.has(context.contentKey) ||
      recipients.get(context.contentKey) !== context.encryptToAddress
    ) {
      throw new Error('Identity upload recipient changed after review.');
    }
    if (
      descriptor.ssk?.length ||
      (context.encryptToAddress && descriptor.ivk?.length)
    ) {
      throw new Error('Unexpected public key in a private identity upload.');
    }

    const ephemeralPublicKeyHex = bytes(descriptor.epk, 32, 'ephemeral key');
    if (
      !descriptor.hasEncryptedData() ||
      !Buffer.isBuffer(descriptor.objectdata) ||
      descriptor.objectdata.length <= 16
    ) {
      throw new Error('Invalid identity upload ciphertext.');
    }

    const keyParams = resolveKeys(descriptor, context);
    // Validate keys even when a resolver accidentally returns incomplete data.
    if (keyParams.symmetricKey !== undefined) {
      bytes(keyParams.symmetricKey, 32, 'symmetric key');
    } else {
      bytes(keyParams.ivk, 32, 'viewing key');
    }

    const plaintext = authenticatedUploadBytes(
      await decryptData({
        ivkHex: keyParams.ivk?.toString('hex'),
        ephemeralPublicKeyHex,
        ciphertextHex: descriptor.objectdata.toString('hex'),
        symmetricKeyHex: keyParams.symmetricKey?.toString('hex'),
      }),
    );
    assertActive();
    if (plaintext.length + 16 !== descriptor.objectdata.length) {
      throw new Error(
        'Invalid authenticated identity upload plaintext length.',
      );
    }

    const wrapped = new BufferDataVdxfObject();
    if (
      wrapped.fromBuffer(plaintext) !== plaintext.length ||
      wrapped.vdxfkey !== DataDescriptorKey.vdxfid ||
      !wrapped.toBuffer().equals(plaintext)
    ) {
      throw new Error(
        'Invalid authenticated identity upload descriptor wrapper.',
      );
    }

    const inner = new DataDescriptor();
    const innerBytes = wrapped.toDataBuffer();
    if (inner.fromBuffer(innerBytes) !== innerBytes.length) {
      throw new Error('Invalid authenticated identity upload descriptor.');
    }
    assertCanonicalUploadDescriptor(inner);
    if (!inner.toBuffer().equals(innerBytes)) {
      throw new Error('Noncanonical authenticated identity upload descriptor.');
    }
    return plaintext;
  };
};
