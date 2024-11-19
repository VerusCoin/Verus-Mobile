/*
MIT License

Copyright (c) 2017 Yuki Akiyama
Copyright (c) 2017 - 2018 SuperNET
Copyright (c) 2019 Michael Filip Toutonghi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import BigNumber from 'bignumber.js';
import { satsToCoins } from '../math';

var bitcoin = require('bitgo-utxo-lib');
// zcash fallback
const Buffer = require('safe-buffer').Buffer;
const {
  readSlice,
  readInt32,
  readUInt32,
  compose,
  addProp,
  readInputs,
  readInput,
  readOutput,
} = require('./deprecatedTxDecoderLib');
const crypto = require('react-native-crypto');
const _sha256 = (data) => {
  return crypto.createHash('sha256').update(data).digest();
};

const decodeFormat = (tx) => {
  var result = {
    txid: tx.getId(),
    version: tx.version,
    locktime: tx.locktime,
  };

  return result;
}

const decodeInput = (tx) => {
  var result = [];

  tx.ins.forEach(function(input, n) {
    var vin = {
      txid: !input.hash.reverse ? input.hash : input.hash.reverse().toString('hex'),
      n: input.index,
      script: bitcoin.script.toASM(input.script),
      sequence: input.sequence,
    };

    result.push(vin);
  });

  return result;
}

const decodeOutput = (tx, network) => {
  var format = (out, n, network) => {
    const satoshi = BigNumber(out.value)
    var vout = {
      satoshi,
      value: satsToCoins(satoshi),
      n: n,
      scriptPubKey: {
        asm: bitcoin.script.toASM(out.script),
        hex: out.script.toString('hex'),
        type: bitcoin.script.classifyOutput(out.script),
        addresses: [],
      },
    };

    switch(vout.scriptPubKey.type) {
      case 'pubkeyhash':
        vout.scriptPubKey.addresses.push(bitcoin.address.fromOutputScript(out.script, network));
        break;
      case 'pubkey':
        const pubKeyBuffer = new Buffer(vout.scriptPubKey.asm.split(' ')[0], 'hex');
        vout.scriptPubKey.addresses.push(bitcoin.ECPair.fromPublicKeyBuffer(pubKeyBuffer, network).getAddress());
        break;
      case 'scripthash':
        vout.scriptPubKey.addresses.push(bitcoin.address.fromOutputScript(out.script, network));
        break;
    }

    return vout;
  }

  var result = [];

  tx.outs.forEach(function(out, n) {
    result.push(format(out, n, network));
  });

  return result;
}

export const TxDecoder = (rawtx, network) => {
  try {
    /*
    console.log('Decoding transaction on network: ')
    console.log(network)
    */
    const _tx = bitcoin.Transaction.fromHex(rawtx, network);
    
    /*console.log('------------------------------------------------------------------------------------')
    console.log(_tx)
    console.log('------------------------------------------------------------------------------------')
    */

    if (network.isZcash && (_tx.joinsplits || (_tx.vShieldedSpend || _tx.vShieldedOutput))) {
      //tx.ins[index].hash is always reversed on iphone/ios for some reason, where on android
      //it isn't reversed

      const buffer = Buffer.from(rawtx, 'hex');

      const readHash = buffer => {
        const [res, bufferLeft] = readSlice(32)(_sha256(_sha256(buffer)))
        const array = Object.keys(res).map(function(key) {
          return res[key];
          });
        const hash = Buffer.from(array.reverse(), 'hex').toString('hex')
        return hash
      };

      _tx.getId = () => {
        return readHash(buffer);
      };
    }
    
    return {
      tx: _tx,
      network: network,
      format: decodeFormat(_tx),
      inputs: !_tx.ins.length ? [{ txid: '0000000000000000000000000000000000000000000000000000000000000000' }] : decodeInput(_tx),
      outputs: decodeOutput(_tx, network),
    };
  } catch (e) {
    console.log(e);
    if (network.isZcash) {
      const buffer = Buffer.from(rawtx, 'hex');

      const decodeTx = buffer => (
        compose([
          addProp('version', readInt32),            // 4 bytes
          addProp('ins', readInputs(readInput)),    // 1-9 bytes (VarInt), Input counter; Variable, Inputs
          addProp('outs', readInputs(readOutput)),  // 1-9 bytes (VarInt), Output counter; Variable, Outputs
          addProp('locktime', readUInt32)           // 4 bytes
        ])({}, buffer)
      );

      const readHash = buffer => {
        const [res, bufferLeft] = readSlice(32)(_sha256(_sha256(buffer)))
        const array = Object.keys(res).map(function(key) {
          return res[key];
          });
        const hash = Buffer.from(array.reverse(), 'hex').toString('hex')
        return hash
      };

      let decodedtx = decodeTx(buffer);
      decodedtx[0].getId = () => {
        return readHash(buffer);
      };

      return {
        tx: decodedtx[0],
        network: network,
        format: decodeFormat(decodedtx[0]),
        inputs: !decodedtx[0].ins.length ? [{ txid: '0000000000000000000000000000000000000000000000000000000000000000' }] : decodeInput(decodedtx[0]),
        outputs: decodeOutput(decodedtx[0], network),
      };
    } else {
      return false;
    }
  }
}

parseTransactionAddresses = (tx, targetAddress, network, skipTargetAddress) => {
  // TODO: - sum vins / sum vouts to the same address
  //       - multi vin multi vout
  //       - detect change address
  //       - double check for exact sum input/output values
  let result = [];
  let _parse = {
    inputs: {},
    outputs: {},
  };
  let _sum = {
    inputs: BigNumber(0),
    outputs: BigNumber(0),
  };
  let _total = {
    inputs: BigNumber(0),
    outputs: BigNumber(0),
  };
  let _addresses = {
    inputs: [],
    outputs: [],
  };

  if (tx.format === 'cant parse') {
    return {
      type: 'unknown',
      amount: 'unknown',
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmed: tx.confirmed,
    }
  }

  for (let key in _parse) {
    if (!tx[key].length) {
      _parse[key] = [];
      _parse[key].push(tx[key]);
    } else {
      _parse[key] = tx[key];
    }

    for (let i = 0; i < _parse[key].length; i++) {
      const bnValue = _parse[key][i].value != null ? BigNumber(_parse[key][i].value) : BigNumber(0)

      _total[key] = _total[key].plus(bnValue);

      // ignore op return outputs
      if (_parse[key][i].scriptPubKey &&
          _parse[key][i].scriptPubKey.addresses &&
          _parse[key][i].scriptPubKey.addresses[0] &&
          _parse[key][i].scriptPubKey.addresses[0] === targetAddress &&
          _parse[key][i].value) {
          _sum[key] = _sum[key].plus(bnValue);
      }

      if (_parse[key][i].scriptPubKey &&
          _parse[key][i].scriptPubKey.addresses &&
          _parse[key][i].scriptPubKey.addresses[0]) {
        _addresses[key].push(_parse[key][i].scriptPubKey.addresses[0]);

        if (_parse[key][i].scriptPubKey.addresses[0] === targetAddress &&
            skipTargetAddress) {
          _addresses[key].pop();
        }
      }
    }
  }

  _addresses.inputs = [ ...new Set(_addresses.inputs) ];
  _addresses.outputs = [ ...new Set(_addresses.outputs) ];

  let isSelfSend = {
    inputs: false,
    outputs: false,
  };

  for (let key in _parse) {
    for (let i = 0; i < _addresses[key].length; i++) {
      if (_addresses[key][i] === targetAddress &&
          _addresses[key].length === 1) {
        isSelfSend[key] = true;
      }
    }
  }

  const inOutDiff = _total.inputs.minus(_total.outputs)

  if (_sum.inputs.isGreaterThan(BigNumber(0)) &&
      _sum.outputs.isGreaterThan(BigNumber(0))) {
    // send to self
    if (isSelfSend.inputs && isSelfSend.outputs) {      
      result = {
        type: 'self',
        fee: inOutDiff.toString(),
        amount: inOutDiff.toString(),
        address: targetAddress,
        timestamp: tx.timestamp,
        txid: tx.format.txid,
        confirmed: tx.confirmed,
      };

      if (network === 'kmd' && inOutDiff.isLessThan(BigNumber(0))) result.interest = inOutDiff
    } else {
      result = [{ // reorder since tx sort by default is from newest to oldest
        type: 'sent',
        amount: _sum.inputs.toString(),
        fee: inOutDiff.toString(),
        address: _addresses.outputs[0],
        timestamp: tx.timestamp,
        txid: tx.format.txid,
        confirmed: tx.confirmed,
        from: _addresses.inputs,
        to: _addresses.outputs,
      }, {
        type: 'received',
        amount: _sum.outputs.toString(),
        address: targetAddress,
        timestamp: tx.timestamp,
        txid: tx.format.txid,
        confirmed: tx.confirmed,
        from: _addresses.inputs,
        to: _addresses.outputs,
      }];

      if (network === 'kmd' && inOutDiff.isLessThan(BigNumber(0))) result.interest = inOutDiff
    }
  } else if (_sum.inputs.isEqualTo(BigNumber(0)) && _sum.outputs.isGreaterThan(BigNumber(0))) {
    result = {
      type: 'received',
      amount: _sum.outputs.toString(),
      address: targetAddress,
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmed: tx.confirmed,
      from: _addresses.inputs,
      to: _addresses.outputs,
    };
  } else if (_sum.inputs.isGreaterThan(BigNumber(0)) && _sum.outputs.isEqualTo(BigNumber(0))) {
    result = {
      type: 'sent',
      amount: _sum.inputs.toString(),
      fee: inOutDiff.toString(),
      address: isSelfSend.inputs && isSelfSend.outputs ? targetAddress : _addresses.outputs[0],
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmed: tx.confirmed,
      from: _addresses.inputs,
      to: _addresses.outputs,
    };
  } else {
    // (?)
    result = {
      type: 'other',
      amount: '0',
      address: 'unknown',
      timestamp: tx.timestamp,
      txid: tx.format.txid,
      confirmed: tx.confirmed,
    };
  }

  return result;
}

export const formatTx = (transactionObj, targetAddress, network) => {
  // Check if any txins contain errors, if so, return false (skips transaction when called)
  if (transactionObj.rawIns && Array.isArray(transactionObj.rawIns)) {
    if (!transactionObj.rawIns.every((txIn) => {
      return !txIn.code
    })) {
      return false
    }

    const txOutDecoded = transactionObj.rawOut ? TxDecoder(transactionObj.rawOut, network) : false

    let txInsDecoded = []

    if (transactionObj.rawIns && transactionObj.rawIns.every(item => {return !(item.status && item.status === 'not found')})) {
      for (let i = 0; i < transactionObj.rawIns.length; i++) {
        txInsDecoded.push(TxDecoder(transactionObj.rawIns[i], network))
      }
    }

    let txInputs = []

    if (txOutDecoded) {
      for (let i = 0; i < txOutDecoded.inputs.length; i++) {
        if(txInsDecoded[i] && txInsDecoded[i].outputs) {
          txInputs.push(txInsDecoded[i].outputs[txOutDecoded.inputs[i].n])
        }
        else {
          txInputs.push(false)
        }
      }

      const _parsedTx = {
        network: txOutDecoded.network,
        format: txOutDecoded.format,
        inputs: txInputs,
        outputs: txOutDecoded.outputs,
        height: transactionObj.height,
        timestamp: Number(transactionObj.height) === 0 ? Math.floor(Date.now() / 1000) : transactionObj.timestamp,
        confirmed: Number(transactionObj.height) === 0 ? false : true,
      }

      let formattedTx = parseTransactionAddresses(_parsedTx, targetAddress, network.coin, false)

      if (formattedTx.type) {
        formattedTx.height = transactionObj.height;
        formattedTx.blocktime = transactionObj.timestamp;
        formattedTx.hex = transactionObj.rawOut;
        formattedTx.inputs = txOutDecoded.inputs;
        formattedTx.outputs = txOutDecoded.outputs;
        formattedTx.locktime = txOutDecoded.format.locktime;
      }

      return formattedTx
    }
    else {
      return false
    }
  } else {
    return false
  }
}