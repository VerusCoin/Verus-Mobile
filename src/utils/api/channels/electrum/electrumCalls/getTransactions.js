import { electrumRequest, getBlockInfo, getOneTransaction } from '../callCreators'
import { TxDecoder, formatTx } from '../../../../crypto/txDecoder';
import NULL_TX from '../../../../crypto/nullTx'
import { networks } from 'bitgo-utxo-lib';
const Buffer = require('safe-buffer').Buffer;

export const getOneTransactionList = (coinObj, activeUser, maxlength = 10) => {
  const callType = 'listtransactions'
  let params = { raw: true, maxlength: maxlength }
  const coinID = coinObj.id

  if (
    activeUser.keys[coinObj.id] != null &&
    activeUser.keys[coinObj.id].electrum != null &&
    activeUser.keys[coinObj.id].electrum.addresses.length > 0
  ) {
    params.address = activeUser.keys[coinObj.id].electrum.addresses[0];
  } else {
    throw new Error(
      "getTransactions.js: Fatal mismatch error, " +
        activeUser.id +
        " user keys for active coin " +
        coinObj.id +
        " not found!"
    );
  }

  return new Promise((resolve, reject) => {
    electrumRequest(coinObj.serverList, callType, params, coinID)
    .then((response) => {
      resolve(response)
    })
    .catch(err => reject(err))
  });
}

export const getParsedTransactionList = (coinObj, activeUser, maxlength) => {
  let network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']

  return new Promise((resolve, reject) => {
    getOneTransactionList(coinObj, activeUser, maxlength)
    .then((transactionList) => {
      if (transactionList) {
        let getTransactionPromises = []
        let getTransactionPromise
        
        for (let i = 0; i < transactionList.result.length; i++) {
          let insPromises = []
          let txInputs = TxDecoder(transactionList.result[i].raw, network).tx.ins

          for (let j = 0; j < txInputs.length; j++) {
            const hash = txInputs[j].hash
            const array = Object.keys(hash).map(function(key) {
              return hash[key];
            });

            const _txid = Buffer.from(array, "hex").toString("hex");

            if (_txid == NULL_TX.toString("hex")) {
              insPromises.push(null)
            } else insPromises.push(getOneTransaction(coinObj, _txid.toString('hex')))
          }
          
          getTransactionPromise = Promise.all(insPromises)
          getTransactionPromises.push(getTransactionPromise)
        }

        getTransactionPromises.push(transactionList)

        return Promise.all(getTransactionPromises)
      }
      else {
        resolve(false)
      }
    })
    .then((gottenTransactions) => {
      let transactionList = gottenTransactions.pop()
      let consolidatedTxs = {currentHeight: transactionList.blockHeight, transactions: []}
      let blockInfoPromises = []

      for (let i = 0; i < transactionList.result.length; i++) {
        let txObj = {
          height: transactionList.result[i].height,
          rawOut: transactionList.result[i].raw,
        }

        if (gottenTransactions[i]) {
          let _rawIns = []
          let insArr = gottenTransactions[i]
          for (let i = 0; i < insArr.length; i++) {
            if (insArr[i] == null) continue;
            
            _rawIns.push(insArr[i].result)
          }

          txObj.rawIns = _rawIns
        }
        else {
          txObj.rawIns = false
        }

        consolidatedTxs.transactions.push(txObj)
        blockInfoPromises.push(getBlockInfo(coinObj, txObj.height))
      }

      
      blockInfoPromises.push(consolidatedTxs)
      return Promise.all(blockInfoPromises)
      
    })
    .then((gottenBlocksInfo) => {
      let consolidatedTxs = gottenBlocksInfo.pop()
      let _parsedTxList = []
      let error = false
      let network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']

      for (let i = 0; i < gottenBlocksInfo.length; i++) {
        if (i < consolidatedTxs.transactions.length) {
          consolidatedTxs.transactions[i].timestamp = gottenBlocksInfo[i].result.timestamp
        }
      }

      if (
        activeUser.keys[coinObj.id] != null &&
        activeUser.keys[coinObj.id].electrum != null &&
        activeUser.keys[coinObj.id].electrum.addresses.length > 0
      ) {
        address = activeUser.keys[coinObj.id].electrum.addresses[0];
      } else {
        throw new Error(
          "Ledger.js: Fatal mismatch error, " +
            activeUser.id +
            " user keys for active coin " +
            coinObj[i].id +
            " not found!"
        );
      }

      for (let i = 0; i < consolidatedTxs.transactions.length; i++) {
        const formattedTx = formatTx(consolidatedTxs.transactions[i], address, network, consolidatedTxs.currentHeight)
        
        if (formattedTx != false) _parsedTxList.push(formattedTx)
        else error = true
      }

      if (error) Alert.alert(`Error reading transaction list for ${coinObj.id}. This may indicate electrum server maintenence.`)
      
      resolve({result: _parsedTxList})
    })
    .catch(err => reject(err))
  });
}