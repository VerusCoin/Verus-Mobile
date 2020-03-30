const bs58check = require('bs58check');

import { isKomodoCoin } from 'agama-wallet-lib/src/coin-helpers';
import electrumJSNetworks from 'agama-wallet-lib/src/bitcoinjs-networks';
import { decryptkey } from './seedCrypt';

import {
  wifToWif,
  seedToWif,
} from 'agama-wallet-lib/src/keys';

export const makeKeyPair = (seed, coinID) => {
  let isWif = false;
  let _seedToWif;
  let keyObj = {};

  try {
    bs58check.decode(seed);
    isWif = true;
  } catch (e) {}

  if (isWif) {
    _seedToWif = wifToWif(seed, isKomodoCoin(coinID) ? electrumJSNetworks.kmd : electrumJSNetworks[coinID.toLowerCase()]);
  } else {
    _seedToWif = seedToWif(seed, isKomodoCoin(coinID) ? electrumJSNetworks.kmd : electrumJSNetworks[coinID.toLowerCase()], true);
  }

  keyObj = {pubKey: _seedToWif.pubHex, privKey: _seedToWif.priv, addresses: [_seedToWif.pub]}

  return keyObj;
}

export const pairFromPwd = (password, encryptedKey, coinID) => {
  let seed = decryptkey(password, encryptedKey);

  return makeKeyPair(seed, coinID);
}
