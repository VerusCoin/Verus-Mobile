// Standalone diagnostic entry: bundle explicitly; never import from the app.
// Uses fresh disposable keys and synthetic data, with no wallet/store access.
import 'fast-text-encoding';
import '../shims/buffer';
import '../shims/crypto';
import React from 'react';
import {AppRegistry, Text} from 'react-native';
import {Buffer} from 'buffer';
import {Tools} from 'react-native-verus';
import {
  DataDescriptor,
  DataDescriptorKey,
  VDXFDataDescriptor,
} from 'verus-typescript-primitives';
import {getKey} from '../src/utils/keyGenerator/keyGenerator';
import {zGetEncryptionAddress} from '../src/utils/api/channels/dlight/requests/zGetEncryptionAddress';
import {encryptData} from '../src/utils/api/channels/dlight/requests/encrypt';
import {decryptData} from '../src/utils/api/channels/dlight/requests/decrypt';

let updateStatus;

// Report only progress and synthetic results to the local diagnostic server.
const progress = stage => {
  updateStatus?.(stage);

  fetch('http://127.0.0.1:8081/native-result', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({stage}),
  }).catch(() => {});
};

AppRegistry.registerComponent('verusmobile', () => () => {
  const [status, setStatus] = React.useState('Starting synthetic validation');
  updateStatus = setStatus;

  return React.createElement(Text, {style: {marginTop: 70}}, status);
});

const requireTrue = (condition, message) => {
  if (!condition) throw new Error(message);
};

const rejectTampering = async operation => {
  let rejected = false;

  try {
    await operation();
  } catch (_) {
    rejected = true;
  }

  requireTrue(rejected, 'Native authentication accepted tampered input');
};

const flip = value => {
  const bytes = Buffer.from(value, 'hex');
  bytes[0] ^= 1;

  return bytes.toString('hex');
};

const run = async () => {
  progress('Generating a disposable mnemonic');
  requireTrue(
    typeof Tools.getVerusEncryptionAddress === 'function',
    'Missing native recipient method',
  );

  let mnemonic = await getKey(256);

  progress('Deriving a disposable native recipient');
  requireTrue(mnemonic.split(' ').length === 24, 'Expected fresh 256-bit mnemonic');

  let keys = await zGetEncryptionAddress('synthetic-no-wallet', {
    mnemonicSeed: mnemonic,
    returnSecret: false,
  });

  progress('Deriving a second disposable native recipient');
  mnemonic = undefined;

  requireTrue(
    typeof keys.address === 'string' && keys.address.startsWith('zs1'),
    'Invalid native recipient',
  );
  requireTrue(/^[0-9a-f]{64}$/i.test(keys.ivk), 'Invalid native IVK');
  requireTrue(keys.spendingKey === undefined, 'Unexpected spending key');

  // A second recipient checks both fresh key generation and wrong-key rejection.
  const second = await zGetEncryptionAddress('synthetic-no-wallet', {
    mnemonicSeed: await getKey(256),
    returnSecret: false,
  });

  requireTrue(
    keys.address !== second.address && keys.ivk !== second.ivk,
    'Repeated fresh recipient',
  );

  let checks = 4;
  const lengths = [];
  const epks = new Set();

  for (const size of [32, 12000, 20000]) {
    progress(`Authenticating native encryption for ${size} synthetic bytes`);

    // Encrypt the tagged descriptor bytes used by actual identity uploads.
    const plaintext = new VDXFDataDescriptor(
      new DataDescriptor({
        objectdata: Buffer.alloc(size, 0xa7),
        salt: Buffer.alloc(32, 0x19),
      }),
      DataDescriptorKey.vdxfid,
    ).toBuffer();

    for (const privateUpload of [false, true]) {
      const encrypted = await encryptData(
        keys.address,
        plaintext.toString('hex'),
        privateUpload,
      );

      requireTrue(
        /^[0-9a-f]{64}$/i.test(encrypted.ephemeralPublicKey),
        'Invalid native EPK',
      );
      requireTrue(!epks.has(encrypted.ephemeralPublicKey), 'Native EPK reuse');
      epks.add(encrypted.ephemeralPublicKey);

      requireTrue(
        Buffer.from(encrypted.encryptedData, 'hex').length === plaintext.length + 16,
        'Wrong tag length',
      );

      const params = {
        ivkHex: keys.ivk,
        ephemeralPublicKeyHex: encrypted.ephemeralPublicKey,
        ciphertextHex: encrypted.encryptedData,
      };

      requireTrue(
        await decryptData(params) === plaintext.toString('hex'),
        'IVK roundtrip differs',
      );

      await rejectTampering(() =>
        decryptData({...params, ciphertextHex: flip(params.ciphertextHex)}),
      );
      await rejectTampering(() => decryptData({...params, ivkHex: second.ivk}));
      checks += 6;

      // Private uploads expose a temporary SSK for local verification without IVK access.
      if (privateUpload) {
        requireTrue(
          /^[0-9a-f]{64}$/i.test(encrypted.symmetricKey),
          'Missing native SSK',
        );

        const symmetric = {
          ciphertextHex: encrypted.encryptedData,
          symmetricKeyHex: encrypted.symmetricKey,
        };

        requireTrue(
          await decryptData(symmetric) === plaintext.toString('hex'),
          'SSK roundtrip differs',
        );

        await rejectTampering(() =>
          decryptData({...symmetric, symmetricKeyHex: flip(encrypted.symmetricKey)}),
        );

        encrypted.symmetricKey = undefined;
        checks += 3;
      } else
        requireTrue(encrypted.symmetricKey === undefined, 'Unexpected public SSK');

      lengths.push(plaintext.length);
    }
  }

  keys = undefined;

  return {
    ok: true,
    checks,
    taggedPlaintextLengths: lengths,
    freshRecipients: 2,
    encryptions: epks.size,
  };
};

run()
  .then(result =>
    fetch('http://127.0.0.1:8081/native-result', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(result),
    }),
  )
  .catch(error =>
    fetch('http://127.0.0.1:8081/native-result', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ok: false, error: error.message}),
    }),
  );
