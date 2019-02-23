const bs58check = require('bs58check');

import { isKomodoCoin } from 'agama-wallet-lib/build/coin-helpers';
import electrumJSNetworks from 'agama-wallet-lib/build/bitcoinjs-networks';
import {
  decryptkey,
} from './seedCrypt';

import {
  wifToWif,
  seedToWif,
} from 'agama-wallet-lib/build/keys';

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

  keyObj = {id: coinID, pubKey: _seedToWif.pub, privKey: _seedToWif.priv}

  return keyObj;
}

export const pairFromPwd = (password, encryptedKey, coinID) => {
  let seed = decryptkey(password, encryptedKey);

  return makeKeyPair(seed, coinID);
}
