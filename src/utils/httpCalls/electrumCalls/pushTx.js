import { postElectrum } from '../callCreators'
import { getUnspentFormatted } from './getUnspent';
import { maxSpendBalance, satsToCoins } from '../../math'
import coinSelect from 'coinselect';
import { buildSignedTx } from '../../crypto/buildTx'
import { TxDecoder } from '../../crypto/txDecoder'

export const pushTx = (coinObj, _rawtx) => {
  const callType = 'pushtx'
  let serverList = coinObj.serverList.serverList
  let data = { rawtx: _rawtx }

  return new Promise((resolve, reject) => {
    postElectrum(serverList, callType, data, null)
    .then((response) => {
      if(!response || !response.result) {
        resolve({
          err: true,
          result: response
        })
      }
      else {
        resolve({
          err: false,
          result: response
        })
      }
    })
  });
}

export const txPreflight = (coinObj, activeUser, outputAddress, value, defaultFee, network, verify) => {
  console.log("Value passed to tx preflight: " + value)
  return new Promise((resolve, reject) => {
    getUnspentFormatted(null, coinObj, activeUser, verify)
    .then((utxoList) => {
      if (utxoList &&
        utxoList.length) {
      let utxoListFormatted = [];
      let totalInterest = 0;
      let totalInterestUTXOCount = 0;
      let interestClaimThreshold = 200;
      let utxoVerified = true;
      let index = 0
      let wif
      let changeAddress
      let feePerByte = 0;
      let btcFees = false;

      if (typeof defaultFee === 'object' && typeof defaultFee !== 'null') {
        //BTC Fee style detected, changing fee unit to fee per byte and 
        //feeding value into coinselect
        feePerByte = Number(defaultFee.feePerByte)
        defaultFee = 0
        btcFees = true
      }

      while (index < activeUser.keys.length && coinObj.id !== activeUser.keys[index].id) {
        index++
      }
      if (index < activeUser.keys.length) {
        wif = activeUser.keys[index].privKey
        changeAddress = activeUser.keys[index].pubKey
      }
      else {
        throw "pushTx.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + coinObj[i].id + " not found!";
      }

      console.log('Utxo list ==>') 
      console.log(utxoList)

      for (let i = 0; i < utxoList.length; i++) {
        if (network.coin === 'komodo' ||
            network.coin === 'kmd') {
          utxoListFormatted.push({
            txid: utxoList[i].txid,
            vout: utxoList[i].vout,
            value: Number(utxoList[i].amountSats),
            interestSats: Number(utxoList[i].interestSats),
            verified: utxoList[i].verified ? utxoList[i].verified : false,
          });
        } else {
          utxoListFormatted.push({
            txid: utxoList[i].txid,
            vout: utxoList[i].vout,
            value: Number(utxoList[i].amountSats),
            verified: utxoList[i].verified ? utxoList[i].verified : false,
          });
        }
      }

      //TODO: Filter out coinbase UTXOs
      const _maxSpendBalance = Number(maxSpendBalance(utxoListFormatted));
      console.log(_maxSpendBalance)
      let targets = [{
        address: outputAddress,
        value: value > _maxSpendBalance ? _maxSpendBalance : value,
      }];
      console.log('targets =>');
      console.log(targets);
      console.log(`create tx network ${network.coin}`)

      targets[0].value = targets[0].value + defaultFee;

      // console.log(`fee rate ${feeRate}`);
      console.log(`default fee ${defaultFee}`);
      console.log(`targets ==>`);
      console.log(targets);

      // default coin selection algo blackjack with fallback to accumulative
      // make a first run, calc approx tx fee
      // if ins and outs are empty reduce max spend by txfee
      let {
        inputs,
        outputs,
        fee
      } = coinSelect(utxoListFormatted, targets, feePerByte);

      console.log('coinselect res =>');
      console.log('coinselect inputs =>');
      console.log(inputs);
      console.log('coinselect outputs =>');
      console.log(outputs);
      console.log('coinselect calculated fee =>');
      console.log(fee);

      if (!outputs) {
        targets[0].value = targets[0].value - defaultFee;
        console.log('second run');
        console.log('coinselect adjusted targets =>');
        console.log(targets);

        const secondRun = coinSelect(utxoListFormatted, targets, feePerByte);
        inputs = secondRun.inputs;
        outputs = secondRun.outputs;
        fee = secondRun.fee;

        console.log('coinselect inputs =>');
        console.log(inputs);
        console.log('coinselect outputs =>');
        console.log(outputs);
        console.log('coinselect fee =>');
        console.log(fee);
      }

      let _change = 0;

      if (outputs &&
          outputs.length === 2) {
        _change = outputs[1].value;
      }

      outputs[0].value = outputs[0].value - defaultFee;

      console.log('adjusted outputs, value - default fee =>');
      console.log(outputs);

      // check if any outputs are unverified
      if (inputs &&
          inputs.length) {
        for (let i = 0; i < inputs.length; i++) {
          if (!inputs[i].verified) {
            utxoVerified = false;
            break;
          }
        }

        for (let i = 0; i < inputs.length; i++) {
          if (Number(inputs[i].interestSats) > interestClaimThreshold) {
            totalInterest += Number(inputs[i].interestSats);
            totalInterestUTXOCount++;
          }
        }
      }

      const _maxSpend = maxSpendBalance(utxoListFormatted);

      if (value > _maxSpend) {
        const successObj = {
          err: true,
          result: `Spend value is too large. Max available amount is ${Number((_maxSpend * 0.00000001.toFixed(8)))}`,
        };

        resolve(successObj);
      } else {
        console.log(`maxspend ${_maxSpend} (${_maxSpend * 0.00000001})`);
        console.log(`value ${value}`);
        console.log(`sendto ${outputAddress} amount ${value} (${value * 0.00000001})`);
        console.log(`changeto ${changeAddress} amount ${_change} (${_change * 0.00000001})`);

        // account for KMD interest
        if ((network.coin === 'komodo' || network.coin === 'kmd') &&
            totalInterest > 0) {
          // account for extra vout
          // const _feeOverhead = outputs.length === 1 ? estimateTxSize(0, 1) * feeRate : 0;
          const _feeOverhead = 0;

          console.log(`max interest to claim ${totalInterest} (${totalInterest * 0.00000001})`);
          console.log(`estimated fee overhead ${_feeOverhead}`);
          console.log(`current change amount ${_change} (${_change * 0.00000001}), boosted change amount ${_change + (totalInterest - _feeOverhead)} (${(_change + (totalInterest - _feeOverhead)) * 0.00000001})`);

          if (_maxSpend === value) {
            _change = Math.abs(totalInterest) - _change - _feeOverhead;

            if (outputAddress === changeAddress) {
              value += _change;
              _change = 0;
              console.log(`send to self ${outputAddress} = ${changeAddress}`);
              console.log(`send to self old val ${value}, new val ${value + _change}`);
            }
          } else {
            _change = _change + (Math.abs(totalInterest) - _feeOverhead);
          }
        }

        if (!inputs &&
            !outputs) {
          const successObj = {
            err: true,
            result: 'Can\'t find best fit utxo. Try lower amount.',
          };

          resolve(successObj);
        } else {
          let vinSum = 0;

          for (let i = 0; i < inputs.length; i++) {
            vinSum += inputs[i].value;
          }

          const _estimatedFee = vinSum - outputs[0].value - _change;

          console.log(`vin sum ${vinSum} (${vinSum * 0.00000001})`);
          console.log(`estimatedFee ${_estimatedFee} (${_estimatedFee * 0.00000001})`);

          let _rawtx;

          _rawtx = buildSignedTx(
            outputAddress,
            changeAddress,
            wif,
            network,
            inputs,
            _change,
            value
          );

          const successObj = {
            err: false,
            result: {
              utxoSet: inputs,
              change: _change,
              inputs,
              outputs,
              // wif,
              fee: btcFees ? satsToCoins(fee) : satsToCoins(_estimatedFee),
              value,
              outputAddress,
              changeAddress,
              network,
              rawtx: _rawtx,
              utxoVerified,
            },
          };

          resolve(successObj);
        }
      }
    } else {
      resolve ({
        err: true,
        result: utxoList,
      });
    }
    })
    .catch((e) => {
      reject(e)
    })
  });
}

export const sendRawTx = (coinObj, activeUser, outputAddress, value, defaultFee, network) => {
  console.log("Value to send raw tx: " + value)
  return new Promise((resolve, reject) => {
    txPreflight(coinObj, activeUser, outputAddress, value, defaultFee, network, true)
    .then((resObj) => {
      if (resObj.err) {
        console.log(resObj)
        throw (resObj)
      } else {
        console.log("Final Tx preflight check completed, pushing tx")
        return pushTx(coinObj, resObj.result.rawtx)
      }
    })
    .then((resObj) => {
      if (resObj.result.result.code) {
        console.log(resObj)
        throw ({
          err: true,
          result: resObj.result.result.message
        })
      } else {
        console.log("Transaction sent succesfully")
        console.log(resObj)
        resolve(resObj.result)
      }
    })
    .catch((err) => {
      console.log(err)
      resolve(err)
    })
  });
}