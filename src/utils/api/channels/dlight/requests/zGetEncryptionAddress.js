import { Tools } from 'react-native-verus';
import { SaplingPaymentAddress, decodeDestination } from 'verus-typescript-primitives';
import { SaplingExtendedViewingKey } from 'verus-typescript-primitives/dist/pbaas/SaplingExtendedViewingKey';
import { SaplingExtendedSpendingKey } from 'verus-typescript-primitives/dist/pbaas/SaplingExtendedSpendingKey';

export const z_getencryptionaddress = async (alias, params) => {

  try
  {
    const fromIdHex = params.fromId
    ? Buffer.from(decodeDestination(params.fromId)).toString('hex')
    : null;

    const toIdHex = params.toId
    ? Buffer.from(decodeDestination(params.toId)).toString('hex')
    : null;

    const keys = await Tools.getVerusEncryptionAddress({
      mnemonicSeed:    params.mnemonicSeed    ?? null,
      extsk:           params.extsk           ?? null,
      fromId:          fromIdHex,            
      toId:            toIdHex,              
      hdIndex:         params.hdIndex         ?? -1,
      encryptionIndex: params.encryptionIndex ?? 0,
      returnSecret:    params.returnSecret    ?? false,
    });

    return {
      result: {
        address:    SaplingPaymentAddress.fromAddressString(keys.address),
        ivk:        Buffer.from(keys.ivk, 'hex'),
        extfvk:     SaplingExtendedViewingKey.fromKeyString(keys.extfvk),
        spendingKey: keys.spendingKey
          ? SaplingExtendedSpendingKey.fromKeyString(keys.spendingKey)
          : null,
      }
    };

  } catch (e) {
     throw new Error(`z_getencryptionaddress key derivation failed ${e.message}`);
  }
};