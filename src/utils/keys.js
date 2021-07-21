const bs58check = require('bs58check');

import { isKomodoCoin } from 'agama-wallet-lib/src/coin-helpers';
import electrumJSNetworks from 'agama-wallet-lib/src/bitcoinjs-networks';

import {
  wifToWif,
  seedToWif,
  seedToPriv
} from 'agama-wallet-lib/src/keys';
import { ETH, ERC20, DLIGHT_PRIVATE, ELECTRUM, WYRE_SERVICE } from './constants/intervalConstants';
import ethers from 'ethers';
import VerusLightClient from 'react-native-verus-light-client'
import {
  KEY_DERIVATION_VERSION,
} from "../../env/index";
import { validateMnemonic } from "bip39"

const deriveLightwalletdKeyPair = async (seed) => {
  const spendingKey = await parseDlightSeed(seed);

  return {
    pubKey: null,
    privKey: spendingKey,
    viewingKey: await VerusLightClient.deriveViewingKey(spendingKey),
    addresses: [],
  };
};

const deriveElectrumKeypair = async (seed, coinID) => {
  let privKey
  let isWif = false;
  let _seedToWif;
  let keyObj = {};

  try {
    privKey = seedToPriv(seed, "btc");
    bs58check.decode(privKey);
    isWif = true;
  } catch (e) {}

  if (isWif) {
    _seedToWif = wifToWif(
      privKey,
      isKomodoCoin(coinID)
        ? electrumJSNetworks.kmd
        : electrumJSNetworks[coinID.toLowerCase()]
    );
  } else {
    _seedToWif = seedToWif(
      seed,
      isKomodoCoin(coinID)
        ? electrumJSNetworks.kmd
        : electrumJSNetworks[coinID.toLowerCase()],
      true
    );
  }

  keyObj = {
    pubKey: _seedToWif.pubHex,
    privKey: _seedToWif.priv,
    addresses: [_seedToWif.pub],
  };

  return keyObj;
};

const deriveWeb3Keypair = async (seed, coinID) => {
  const electrumKeys = await deriveElectrumKeypair(seed, coinID);
  let seedIsEthPrivkey = false

  try {
    new ethers.utils.SigningKey(seed)
    seedIsEthPrivkey = true
  } catch(e) {}

  return {
    pubKey: electrumKeys.pubKey,
    privKey: seedIsEthPrivkey ? seed : seedToPriv(electrumKeys.privKey, "eth"),
    addresses: [
      ethers.utils.computeAddress(
        seedIsEthPrivkey ? seed : Buffer.from(electrumKeys.pubKey, "hex")
      ),
    ],
  };
};

const deriveWyreKeypair = async (seed) => {
  return {
    pubKey: "",
    privKey: "",
    addresses: [],
  };
};

const CHANNEL_DERIVATIONS = {
  [DLIGHT_PRIVATE]: deriveLightwalletdKeyPair,
  [ETH]: deriveWeb3Keypair,
  [ERC20]: deriveWeb3Keypair,
  [ELECTRUM]: deriveElectrumKeypair,
  [WYRE_SERVICE]: deriveWyreKeypair
}

export const deriveKeyPairV1 = async (seed, coinID, channel) => {
  if (CHANNEL_DERIVATIONS[channel]) {
    return await CHANNEL_DERIVATIONS[channel](seed, coinID)
  } else return await deriveElectrumKeypair(seed, coinID)
}

// This is purely for backwards compatibility, DO NOT USE
export const deriveKeypairV0 = async (seed, coinID, channel) => {
  if (channel === DLIGHT_PRIVATE) {
    const spendingKey = await parseDlightSeed(seed)

    return {
      pubKey: null,
      privKey: spendingKey,
      viewingKey: await VerusLightClient.deriveViewingKey(spendingKey),
      addresses: [],
    };
  } else {
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
  
    keyObj = {
      pubKey: _seedToWif.pubHex,
      privKey: channel === ETH || channel === ERC20 ? seedToPriv(_seedToWif.priv, 'eth') : _seedToWif.priv,
      addresses: [
        channel === ETH || channel === ERC20
          ? ethers.utils.computeAddress(Buffer.from(_seedToWif.pubHex, "hex"))
          : _seedToWif.pub,
      ],
    };
  
    return keyObj;
  }
}

export const DERIVATION_VERSIONS = {
  [0]: deriveKeypairV0,
  [1]: deriveKeyPairV1
}

export const deriveKeyPair = async (seed, coinID, channel, version = KEY_DERIVATION_VERSION) => {
  if (DERIVATION_VERSIONS[version] == null) throw new Error("Cannot derive keypair for version " + version)
  else {
    return await DERIVATION_VERSIONS[version](seed, coinID, channel)
  }
}

export const isDlightSpendingKey = (seed) => {
  return seed.startsWith('secret-extended-key-main')
}

export const parseDlightSeed = async (seed) => {
  if (isDlightSpendingKey(seed)) return seed
  
  try {
    const keys = await VerusLightClient.deriveSpendingKeys(seed, true, 1)
    return keys[0]
  } catch(e) { throw e }
}

export const isSeedPhrase = (seed, minWordLength = 12) => {
  return (
    seed.split(/\s+/g).length >= minWordLength && validateMnemonic(seed)
  );
}