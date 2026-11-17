import {validateMnemonic} from 'bip39';
import {ECPair, networks} from '@bitgo/utxo-lib';

export const isCustomImportSeed = text => {
  if (!text) return false;
  // Do not normalize the text: the imported wallet depends on these bytes.
  if (validateMnemonic(text)) return false;
  try {
    ECPair.fromWIF(text, Object.values(networks));
    return false;
  } catch (_) {
    return true;
  }
};
