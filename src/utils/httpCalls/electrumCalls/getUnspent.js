import { updateValues, getMerkle } from '../callCreators'
import { getOneTransaction } from './getTransaction'
import { TxDecoder } from '../../crypto/txDecoder'
import { networks } from 'bitgo-utxo-lib';
import { coinsToSats, satsToCoins, kmdCalcInterest, truncateDecimal } from '../../math'

export const getUnspent = (oldList, coinObj, activeUser) => {
  const callType = 'listunspent'
  let index = 0
  let params = {}
  const coinID = coinObj.id

  while (index < activeUser.keys.length && coinID !== activeUser.keys[index].id) {
    index++
  }
  if (index < activeUser.keys.length) {
    params.address = activeUser.keys[index].pubKey
  }
  else {
    throw "getUnspent.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + coinID + " not found!";
  }

  

  return new Promise((resolve, reject) => {
    updateValues(oldList, coinObj.serverList.serverList, callType, params, coinID)
    .then((response) => {
      if(!response.new || !response) {
        resolve(false)
      }
      else {
        console.log(response)
        response.result.address = params.address
        resolve(response.result)
      }
    })
  });
}

//Fix by getting rid of txid requirement, instead getting txid from each item 
//in response of getUnspent. Also, use currentHeight to filter out unconfirmed
//utxos
export const getUnspentFormatted = (oldList, coinObj, activeUser, verify) => {
  return new Promise((resolve, reject) => {
    getUnspent(oldList, coinObj, activeUser)
    .then((res) => {
      let serverUsed = res.serverUsed
      let _utxoList = res.result
      let address = res.address
      let getTxPromiseArray = []
      let currentHeight = res.blockHeight

      if (!_utxoList.length) {
        throw "no valid utxo"
      }
      else {

        //Filter out unconfirmed UTXOs
        for (let i = 0; i < _utxoList.length; i++) {
          if(Number(currentHeight) - Number(_utxoList[i].height) !== 0) {
            getTxPromiseArray.push(getOneTransaction(null, coinObj, activeUser, _utxoList[i].tx_hash))
          }
        }

        getTxPromiseArray.push(_utxoList)
        getTxPromiseArray.push(serverUsed)
        getTxPromiseArray.push(address)

        return Promise.all(getTxPromiseArray)
      }
    })
    .then((gottenTransactions) => {
      let address = gottenTransactions.pop()
      let serverUsed = gottenTransactions.pop()
      let _utxoList = gottenTransactions.pop()
      let _formattedUtxoList = []
      let network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']
      let verifyMerklePromises = []

      for (let i = 0; i < _utxoList.length; i++) {
        const _utxoItem = _utxoList[i]

        if (gottenTransactions[i]) {
          const decodedTx = TxDecoder(gottenTransactions[i].result, network)
          const currentHeight = gottenTransactions[i].blockHeight
          
          if (!decodedTx) {
            throw 'cant decode tx'
          } else {
            if (network.coin === 'kmd') {
              let interest = 0;

              if (satsToCoins(Number(_utxoItem.value)) >= 10 &&
                  decodedTx.format.locktime > 0) {
                interest = kmdCalcInterest(decodedTx.format.locktime, _utxoItem.value);
              }

              let _resolveObj = {
                txid: _utxoItem['tx_hash'],
                vout: _utxoItem['tx_pos'],
                address,
                amount: satsToCoins(Number(_utxoItem.value)),
                amountSats: _utxoItem.value,
                interest: interest,
                interestSats: coinsToSats(truncateDecimal(interest, 8)),
                confirmations: Number(_utxoItem.height) === 0 ? 0 : currentHeight - _utxoItem.height,
                spendable: true,
                verified: false,
                locktime: decodedTx.format.locktime,
              };

              // merkle root verification against another electrum server
              if (verify) {
                verifyMerklePromises.push(
                  getMerkle(
                    null,
                    coinObj,
                    _utxoItem['tx_hash'],
                    _utxoItem.height,
                    serverUsed
                  ))
              } 
                
              _formattedUtxoList.push(_resolveObj);
            } else {
              let _resolveObj = {
                txid: _utxoItem['tx_hash'],
                vout: _utxoItem['tx_pos'],
                address,
                amount: satsToCoins(Number(_utxoItem.value)),
                amountSats: _utxoItem.value,
                confirmations: Number(_utxoItem.height) === 0 ? 0 : currentHeight - _utxoItem.height,
                spendable: true,
                verified: false,
              };

              // merkle root verification agains another electrum server
              if (verify) {
                verifyMerklePromises.push(
                  getMerkle(
                    null,
                    coinObj,
                    _utxoItem['tx_hash'],
                    _utxoItem.height,
                    serverUsed
                  ))
              } 
                
              _formattedUtxoList.push(_resolveObj);
            }
          }
        }
        else {
          console.log("Error being thrown with transaction")
          console.log("Number of UTXOs: " + _utxoList.length)
          console.log("Raw Transactions fetched: " + gottenTransactions.length)

          console.log("Printing full UTXO list below line")
          console.log("---------------------------------------")
          for (let i = 0; i < _utxoList.length; i++) {
            console.log(_utxoList[i])
          }
          console.log("---------------------------------------")

          console.log("Printing full raw transaction list below line")
          console.log("---------------------------------------")
          for (let i = 0; i < gottenTransactions.length; i++) {
            console.log(gottenTransactions[i])
          }
          console.log("---------------------------------------")
          throw "getUnspent.js: Fatal mismatch error, couldn't fetch raw transactions for all UTXOs, see details above"
        }
      }

        
      verifyMerklePromises.push(_formattedUtxoList)
      return Promise.all(verifyMerklePromises)
    })
    .then((verifiedMerkleArr) => {
      let _formattedUtxoList = verifiedMerkleArr.pop()
      console.log(verifiedMerkleArr)

      for (let i = 0; i < verifiedMerkleArr.length; i++) {
        if(_formattedUtxoList[i]) {
          if (verifiedMerkleArr[i] && verifiedMerkleArr[i].result && verifiedMerkleArr[i].result.merkle) {
            _formattedUtxoList[i].verified = true
          }
        }
        else {
          throw "getUnspent.js: Fatal mismatch error, no utxo list found for verified merkle " + verifiedMerkleArr[i]
        }
      }

      resolve(_formattedUtxoList)
    })
    .catch(err => {
      reject(err)
    })
  });
}