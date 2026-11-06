// Run through runIdentityUploadNativeValidation.cjs on each native platform.
// All inputs are disposable; report only assertions, never channel keys.
import { Tools } from 'react-native-verus';
import { spendingKeyHex } from '../src/utils/crypto/spendingKeyHex';
import { zGetEncryptionAddress } from '../src/utils/api/channels/dlight/requests/zGetEncryptionAddress';

export const validateAppEncryptionNativeEncoding = async mnemonicSeed => {
  let checks = 0;
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    checks += 1;
  };

  const wallet = await zGetEncryptionAddress('synthetic-no-wallet', {
    mnemonicSeed,
    returnSecret: true,
  });
  const walletHex = spendingKeyHex(wallet.spendingKey);

  check(walletHex.length === 338, 'Incorrect wallet spending-key length');
  check(
    walletHex === await Tools.bech32Decode(wallet.spendingKey),
    'JavaScript and native spending-key decoding differ',
  );

  const derive = async (scope, primary, secondary, returnSecret = false) => {
    const fromId = '01'.repeat(20);
    const base = await zGetEncryptionAddress('synthetic-no-wallet', {
      extsk: walletHex,
      fromId,
      toId: scope.repeat(20),
      hdIndex: -1,
      encryptionIndex: primary,
      returnSecret: true,
    });
    const baseHex = spendingKeyHex(base.spendingKey);

    check(baseHex.length === 338, 'Incorrect intermediate spending-key length');
    check(
      baseHex === await Tools.bech32Decode(base.spendingKey),
      'Intermediate JavaScript and native spending-key decoding differ',
    );

    const final = await zGetEncryptionAddress('synthetic-no-wallet', {
      extsk: baseHex,
      fromId,
      toId: '04'.repeat(20),
      hdIndex: -1,
      encryptionIndex: secondary,
      returnSecret,
    });

    check(final.address !== base.address, 'Nested address reused the app scope address');
    check(final.extfvk !== base.extfvk, 'Nested viewing key reused the app scope key');
    check(
      returnSecret ? spendingKeyHex(final.spendingKey).length === 338 : final.spendingKey === undefined,
      'Final spending-key permission was not respected',
    );

    return { base, final };
  };

  const original = await derive('02', 7, 0);
  const repeated = await derive('02', 7, 0, true);
  const otherApp = await derive('03', 7, 0);
  const otherPrimary = await derive('02', 8, 0);
  const otherSecondary = await derive('02', 7, 9);

  check(original.final.address === repeated.final.address, 'Nested derivation was not deterministic');
  check(original.final.extfvk === repeated.final.extfvk, 'Viewing keys were not deterministic');
  check(original.final.address !== otherApp.final.address, 'App scopes were not isolated');
  check(original.base.address !== otherPrimary.base.address, 'Primary index did not change the app scope');
  check(original.final.address !== otherPrimary.final.address, 'Primary index did not change the nested channel');
  check(original.base.address === otherSecondary.base.address, 'Secondary index changed the app scope');
  check(original.final.address !== otherSecondary.final.address, 'Secondary index did not change the nested channel');

  return { checks, nestedDerivations: 5 };
};
