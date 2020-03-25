import { 
  setBalances,
  setOneBalance,
  setTransactions,
  updateCoinRates
} from '../actionCreators';

import NULL_TX from '../../utils/crypto/nullTx'

import { Alert } from 'react-native'

import { 
  getBalances,
  getOneBalance,
  getParsedTransactionList
} from '../../utils/api/channels/electrum/callCreators';

import {
  getCoinRates,
  getAllCoinRates
} from "../../utils/api/channels/general/callCreators";

import { TxDecoder, formatTx } from '../../utils/crypto/txDecoder';
import { networks } from 'bitgo-utxo-lib';

const Buffer = require('safe-buffer').Buffer;

// DELET: Deprecated
/*export const updateCoinTransactions = (coinID, transactions, needsUpdateObj) => {
  let _transactions = []
  _transactions[coinID] = transactions

  let _needsUpdateObj = needsUpdateObj
  _needsUpdateObj[coinID] = false
  
  return setTransactions(_transactions, _needsUpdateObj)
}

export const fetchTransactionsForCoin = (coinObj, activeUser, needsUpdateObj, maxlength) => {
  return new Promise((resolve, reject) => {
    getParsedTransactionList(coinObj, activeUser, maxlength)
    .then((parsedTxList) => {
      resolve(updateCoinTransactions(coinObj.id, parsedTxList.result, needsUpdateObj))
    })
    .catch(err => reject(err))
  });
}*/

DELETE/REFACTOR
/*export const fetchTransactionsForCoin = (coinObj, activeUser, needsUpdateObj, maxlength) => {
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

      resolve(updateCoinTransactions(coinObj.id, _parsedTxList, needsUpdateObj))
    })
    .catch(err => reject(err))
  });
}*/

// DELET: Deprecated
/*export const updateCoinBalances = (activeCoinsForUser, activeUser, needsUpdateObj) => {
  return new Promise((resolve, reject) => {
    getBalances(activeCoinsForUser, activeUser)
    .then(balances => {
      if (!balances) {
        resolve(false)
      }
      else {
        let newUpdateObj = {}
        Object.keys(needsUpdateObj).map(coinId => {
          newUpdateObj[coinId] = false
        })

        resolve(setBalances(balances, newUpdateObj))
      }
    })
    .catch(err => reject(err));
  });
}*/

// DELET: Deprecated
/*export const updateOneBalance = (coinObj, activeUser) => {
  return new Promise((resolve, reject) => {
    getOneBalance(coinObj, activeUser)
    .then(balance => {
      if (!balance) {
        resolve(false)
      }
      else {
        resolve(setOneBalance(coinObj.id, balance.result))
      }
    })
    .catch(err => {
      reject(err)
    });
  });
}*/

// DELETE/REFACTOR: Deprecated
/*export const updateOneRate = (coinObj, coinRates) => {
  return new Promise((resolve, reject) => {
    getCoinRates(coinObj)
    .then(() => {
      let _coinRates = coinRates
      _coinRates[coinObj.id] = res.rateUsd
      if (res) {
        resolve(updateCoinRates(_coinRates))
      }
      else {
        resolve(false)
      }
    })
    .catch(err => reject(err));
  });
}*/

// DELET: Deprecated
/*export const setCoinRates = (activeCoinsForUser) => {
  return new Promise((resolve, reject) => {
    getAllCoinRates(activeCoinsForUser)
    .then(rates => {
      if(rates) {
        resolve(updateCoinRates(rates))
      }
      else {
        resolve(false)
      }
    })
    .catch(err => reject(err));
  });
}*/

