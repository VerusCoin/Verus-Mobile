const bigi = require('bigi');
const bitcoin = require("@bitgo/utxo-lib");
const bs58check = require('bs58check');
const ethUtil = require('ethereumjs-util');
const ethersWallet = require('ethers')
const wif = require('wif');
const { sha256 } = require('../crypto/hash');
const { secp256k1 } = require('@noble/curves/secp256k1');
const { Alert } = require('react-native');

const wifToWif = (_wif, network) => {
  const key = new bitcoin.ECPair.fromWIF(_wif, network, true);

  return {
    pub: key.getAddress(),
    priv: key.toWIF(),
    pubHex: key.getPublicKeyBuffer().toString('hex'),
  };
};

const seedToWif = (seed, network, iguana) => {
  let isWif = false;

  try {
    bs58check.decode(typeof seed === 'string' ? seed : '');
    isWif = true;
    throw new Error('provided string is a WIF key');
  } catch (e) {
    if (!isWif) {
      const bytes = Buffer.from(sha256(seed)); // must be 32 bytes
      if (bytes.length !== 32) {
        throw new Error('sha256 must return 32 bytes');
      }

      if (iguana) {
        bytes[0] &= 248;
        bytes[31] &= 127;
        bytes[31] |= 64;
      }

      // bigi -> bigint for the noble check
      const dBigi = bigi.fromBuffer(bytes);
      const dBig  = BigInt('0x' + dBigi.toBuffer(32).toString('hex'));
      const n     = secp256k1.CURVE.n; // bigint

      if (dBig === BigInt(0)) {
        throw new Error('derived private key scalar is out of range');
      } else if (dBig >= n) {
        Alert.alert(
          'Private Key Warning',
          'The derived private key scalar is ≥ curve order. Some wallets may behave inconsistently when importing it. Consider generating a new seed.'
        );
      }

      // proceed with utxolib ECPair (legacy API)
      const keyPair = new bitcoin.ECPair(dBigi, null, { network });

      return {
        pub: keyPair.getAddress(),                               // P2PKH
        priv: keyPair.toWIF(),                                   // WIF (compressed)
        pubHex: keyPair.getPublicKeyBuffer().toString('hex'),    // 33-byte compressed
      };
    } else {
      throw new Error('provided string is a WIF key');
    }
  }
};

// src: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/ecpair.js#L62
const fromWif = (string, network, versionCheck) => {
  const decoded = wif.decode(string);
  const version = decoded.version;

  if (!network) throw new Error('Unknown network version');
  
  if (versionCheck) {
    if (network.wifAlt && version !== network.wif && network.wifAlt.indexOf(version) === -1) throw new Error('Invalid network version');
    if (!network.wifAlt && version !== network.wif) throw new Error('Invalid network version');  
  }

  const d = bigi.fromBuffer(decoded.privateKey);
  const masterKP = new bitcoin.ECPair(d, null, {
    network,
  });

  if (network.wifAlt) {
    const altKP = [];

    for (let i = 0; i < network.wifAlt.length; i++) {
      const _network = JSON.parse(JSON.stringify(network));
      _network.wif = network.wifAlt[i];

      const _altKP = new bitcoin.ECPair(d, null, {
        network: _network,
      });

      altKP.push({
        pub: _altKP.getAddress(),
        priv: _altKP.toWIF(),
        version: network.wifAlt[i],
      });
    }

    return {
      inputKey: decoded,
      master: {
        pub: masterKP.getAddress(),
        priv: masterKP.toWIF(),
        version: network.wif,
      },
      alt: altKP,
    };
  }
  
  return {
    inputKey: decoded,
    master: {
      pub: masterKP.getAddress(),
      priv: masterKP.toWIF(),
      version: network.wif,
    },
  };
};

const ethToBtcWif = (priv, network) => {
  const buf = ethUtil.toBuffer(priv);
  const d = bigi.fromBuffer(buf);

  return new bitcoin.ECPair(d, null, {
    compressed: true,
    network: bitcoin.networks.bitcoin,
  })
  .toWIF();
};

const btcToEthPriv = (_wif) => {
  const decodedWif = wif.decode(_wif);
  const ethWallet = new ethersWallet.Wallet(ethUtil.bufferToHex(decodedWif.privateKey));

  return ethWallet.privateKey;
};

const seedToPriv = (string, dest) => {
  let bs58 = false
  try {
    bs58check.decode(string);
    bs58 = true;
  } catch (e) {}

  if (bs58) return dest === 'btc' ? string : btcToEthPriv(string);

  if (ethUtil.isValidPrivate(ethUtil.toBuffer(string))) {
    return dest === 'eth' ? string : ethToBtcWif(string);
  }

  return string;
};

module.exports = {
  wifToWif,
  seedToWif,
  fromWif,
  ethToBtcWif,
  seedToPriv
};