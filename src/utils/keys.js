const bs58check = require('bs58check');
import {
  wifToWif,
  seedToWif,
  seedToPriv
} from './agama-wallet-lib/keys';
import { ETH, ERC20, DLIGHT_PRIVATE, ELECTRUM, WYRE_SERVICE } from './constants/intervalConstants';
import ethers from 'ethers';

//import VerusLightClient from 'react-native-verus-light-client'
import { Tools } from 'react-native-verus'

import {
  KEY_DERIVATION_VERSION,
} from "../../env/index";
import { validateMnemonic } from "bip39"
import { networks } from "@bitgo/utxo-lib"

const deriveLightwalletdKeyPair = async (seed) => {
  const spendingKey = await parseDlightSeed(seed);

  return {
    pubKey: null,
    privKey: spendingKey,
    viewingKey: await Tools.deriveViewingKey(seed),
    addresses: [],
  };
};

const deriveElectrumKeypair = async (seed, coinObj) => {
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
      networks[coinObj.bitgojs_network_key]
    );
  } else {
    _seedToWif = seedToWif(
      seed,
      networks[coinObj.bitgojs_network_key],
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

const deriveWeb3Keypair = async (seed, coinObj) => {
  const electrumKeys = await deriveElectrumKeypair(seed, coinObj.id);
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

export const deriveKeyPairV1 = async (seed, coinObj, channel) => {
  if (CHANNEL_DERIVATIONS[channel]) {
    return await CHANNEL_DERIVATIONS[channel](seed, coinObj)
  } else return await deriveElectrumKeypair(seed, coinObj)
}

// This is purely for backwards compatibility, DO NOT USE
export const deriveKeypairV0 = async (seed, coinObj, channel) => {
  if (channel === DLIGHT_PRIVATE) {
    const spendingKey = await parseDlightSeed(seed)
    const viewKey = await Tools.deriveViewingKey(seed);

    return {
      pubKey: null,
      privKey: spendingKey,
      viewingKey: viewKey,
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
      _seedToWif = wifToWif(seed, networks[coinObj.bitgojs_network_key]);
    } else {
      _seedToWif = seedToWif(seed, networks[coinObj.bitgojs_network_key], true);
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

export const deriveKeyPair = async (seed, coinObj, channel, version = KEY_DERIVATION_VERSION) => {
  if (DERIVATION_VERSIONS[version] == null) throw new Error("Cannot derive keypair for version " + version)
  else {
    return await DERIVATION_VERSIONS[version](seed, coinObj, channel)
  }
}

export const isDlightSpendingKey = (seed) => {
  return seed.startsWith('secret-extended-key-main')
}

export const parseDlightSeed = async (seed) => {
  //console.log("parseDlightSeed called!")
  if (isDlightSpendingKey(seed)) return seed
  
  try {
    const viewkey = await Tools.deriveViewingKey(seed)
    //console.log("Viewkey(" + viewkey + ")")

    const saplingAddress = await Tools.deriveShieldedAddress(seed)
    //console.log("deriveShieldedAddress(" + saplingAddressFromView + ")")

    const isValid = await Tools.isValidAddress(saplingAddress)
    //console.log("isValidAddress(" + isValid + ")");

    const saplingSpendKey = await Tools.deriveSaplingSpendingKey(seed)
    //console.log("SaplingSpendingKey(" + saplingSpendKey + ")");

    //TODO: below does not derive properly, and we can use the above function anyway
    //const saplingAddrFromSeed = await Tools.deriveShieldedAddressFromSeed(seed)
    //console.log("saplingAddrFromSeed(" + saplingAddrFromSeed + ")")

    return saplingSpendKey
  } catch(e) { throw e }
}

export const dlightSeedToBytes = (seed) => {
  return VerusLightClient.deterministicSeedBytes(seed)
}

export const isSeedPhrase = (seed, minWordLength = 12) => {
  return (
    seed.split(/\s+/g).length >= minWordLength && validateMnemonic(seed)
  );
}

