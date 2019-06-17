import { 
  setBalances,
  setTransactions,
  updateCoinRates
} from '../actionCreators';

import { 
  getBalances,
  getOneBalance,
  getCoinRate,
  getAllCoinRates,
  getOneTransactionList,
  getOneTransaction,
  getBlockInfo
} from '../../utils/httpCalls/callCreators';

import { TxDecoder } from '../../utils/crypto/txDecoder';
import { networks } from 'bitgo-utxo-lib';
import { formatTx } from '../../utils/crypto/txDecoder';

const Buffer = require('safe-buffer').Buffer;

export const updateCoinTransactions = (coinID, transactions, oldTransactions, needsUpdateObj) => {
  let _transactions = oldTransactions
  _transactions[coinID] = transactions

  let _needsUpdateObj = needsUpdateObj
  _needsUpdateObj[coinID] = false
  
  return setTransactions(_transactions, _needsUpdateObj)
}

export const fetchTransactionsForCoin = (oldTransactions, coinObj, activeUser, needsUpdateObj) => {

  let network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']

  return new Promise((resolve, reject) => {
    getOneTransactionList(oldTransactions, coinObj, activeUser)
    .then((transactionList) => {
      if (transactionList) {
        let getTransactionPromises = []
        let getTransactionPromise
        
        for (let i = 0; i < transactionList.result.length; i++) {
          let insPromises = []
          let txInputs = TxDecoder(transactionList.result[i].raw, network).tx.ins

          _oldTx = oldTransactions.hasOwnProperty('result') ? (i < oldTransactions.result.length ? oldTransactions.result[i] : null) : null

          for (let j = 0; j < txInputs.length; j++) {
            const hash = txInputs[j].hash
            const array = Object.keys(hash).map(function(key) {
              return hash[key];
            });

            const _txid = Buffer.from(array, 'hex').toString('hex')

            insPromises.push(getOneTransaction(null, coinObj, activeUser, _txid))
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
            _rawIns.push(insArr[i].result)
          }

          txObj.rawIns = _rawIns
        }
        else {
          txObj.rawIns = false
        }

        consolidatedTxs.transactions.push(txObj)
        blockInfoPromises.push(getBlockInfo(null, coinObj, activeUser, txObj.height))
      }

      
      blockInfoPromises.push(consolidatedTxs)
      return Promise.all(blockInfoPromises)
      
    })
    .then((gottenBlocksInfo) => {
      let consolidatedTxs = gottenBlocksInfo.pop()
      let _parsedTxList = []
      let index = 0
      let network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']

      for (let i = 0; i < gottenBlocksInfo.length; i++) {
        if (i < consolidatedTxs.transactions.length) {
          consolidatedTxs.transactions[i].timestamp = gottenBlocksInfo[i].result.timestamp
        }
      }

      if (activeUser.keys.hasOwnProperty(coinObj.id)) {
        address = activeUser.keys[coinObj.id].pubKey
      } else {
        throw new Error("Ledger.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + coinObj[i].id + " not found!");
      }

      for (let i = 0; i < consolidatedTxs.transactions.length; i++) {
        _parsedTxList.push(formatTx(consolidatedTxs.transactions[i], address, network, consolidatedTxs.currentHeight))
      }

      resolve(updateCoinTransactions(coinObj.id, _parsedTxList, oldTransactions, needsUpdateObj))
    })
    .catch(err => reject(err))
  });
}

export const updateCoinBalances = (oldBalances, activeCoinsForUser, activeUser) => {
  return new Promise((resolve, reject) => {
    getBalances(oldBalances, activeCoinsForUser, activeUser)
    .then(balances => {
      if (!balances) {
        resolve(false)
      }
      else {
        resolve(setBalances(balances))
      }
    })
    .catch(err => reject(err));
  });
}

export const updateOneBalance = (oldBalances, coinObj, activeUser) => {
  let _balances = oldBalances

  return new Promise((resolve, reject) => {
    getOneBalance(oldBalances[coinObj.id], coinObj, activeUser)
    .then(balance => {
      if (!balances) {
        resolve(false)
      }
      else {
        _balances[coinObj.id] = balance
        resolve(setBalances(_balances))
      }
    })
    .catch(err => reject(err));
  });
}

export const updateOneRate = (coinObj, coinRates) => {
  return new Promise((resolve, reject) => {
    getCoinRate(coinObj)
    .then(resizeTo => {
      let _coinRates = coinRates
      _coinRates[coinObj.id] = res.rate
      if (res) {
        resolve(updateCoinRates(_coinRates))
      }
      else {
        resolve(false)
      }
    })
    .catch(err => reject(err));
  });
}

export const setCoinRates = (activeCoinsForUser) => {
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
}

