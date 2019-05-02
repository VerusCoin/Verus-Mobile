import { updateValues, getMerkleRoot, getBlockInfo } from '../callCreators'
import { getOneTransaction } from './getTransaction'
import { TxDecoder } from '../../crypto/txDecoder'
import { hashRawTx, hexHashToDecimal } from '../../crypto/hash'
import { arraysEqual } from '../../objectManip'
import { networks } from 'bitgo-utxo-lib'
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
    throw new Error("getUnspent.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + coinID + " not found!")
  }

  

  return new Promise((resolve, reject) => {
    updateValues(oldList, coinObj.serverList.serverList, callType, params, coinID)
    .then((response) => {
      if(!response.new || !response) {
        resolve(false)
      }
      else {
        response.result.address = params.address
        resolve(response.result)
      }
    })
    .catch((err) => {
      console.log("Caught error in getUnspent.js")
      reject(err)
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
        throw new Error("no valid utxo")
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

          if (!arraysEqual(hashRawTx(gottenTransactions[i].result, network), hexHashToDecimal(_utxoItem['tx_hash']))) {
            throw new Error(
              'Mismatch error! At least one transaction ID provided by server ' + JSON.stringify(serverUsed) + 
              ' does not match the values of the transaction that it represents! This could indicate that the server is malicious, and this transaction has been canceled.')
          } else {
            console.log(_utxoItem['tx_hash'] + ' succesfully verified against its hashed raw tx')
          }
          
          if (!decodedTx) {
            throw new Error('Can\'t decode tx')
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
                merkleRoot: null,
                locktime: decodedTx.format.locktime,
              };

              // merkle root verification against another electrum server
              if (verify) {
                verifyMerklePromises.push(
                  getMerkleRoot(
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
                merkleRoot: null,
              };

              // merkle root verification against another electrum server
              if (verify) {
                verifyMerklePromises.push(
                  getMerkleRoot(
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
          throw new Error("getUnspent.js: Fatal mismatch error, couldn't fetch raw transactions for all UTXOs")
        }
      }

        
      verifyMerklePromises.push(_formattedUtxoList)
      return Promise.all(verifyMerklePromises)
    })
    .then((verifiedMerkleArr) => {
      let _formattedUtxoList = verifiedMerkleArr.pop()
      let blockInfoPromises = [];
      let i = 0
      let unshieldedFunds = 0

      //We loop through each item in the unspent transaction array, finding the merkle
      //root for each transaction, and eliminating all unspent coinbase transactions as
      //they can't be sent before being shielded
      while (i < verifiedMerkleArr.length) {
        if(_formattedUtxoList[i] && verifiedMerkleArr[i] && _formattedUtxoList.length === verifiedMerkleArr.length) {
          if (
            verifiedMerkleArr[i].result && 
            verifiedMerkleArr[i].result.root && 
            Number(verifiedMerkleArr[i].result.index) > 0) {
            _formattedUtxoList[i].merkleRoot = verifiedMerkleArr[i].result.root

            if (__DEV__) {
              console.log("UTXO #" + i)
              console.log(_formattedUtxoList[i])
            }

            blockInfoPromises.push(getBlockInfo(null, coinObj, activeUser, verifiedMerkleArr[i].result.height))
            i++
          } else {
            unshieldedFunds += _formattedUtxoList[i].amountSats
            verifiedMerkleArr.splice(i, 1);
            _formattedUtxoList.splice(i, 1);
          } 
        }
        else {
          throw new Error("getUnspent.js: Fatal mismatch error, no utxo list found for verified merkle " + verifiedMerkleArr[i] +
          "or length of verified merkle root array does not match length of uspent transaction array")
        }
      }

      if (__DEV__) {
        console.log("Filtered out " + unshieldedFunds + " coins due to coinbase non-shielded fund filtering")
      }

      blockInfoPromises.push(_formattedUtxoList)
      blockInfoPromises.push(unshieldedFunds)

      return Promise.all(blockInfoPromises)
    })
    .then((blockInfoArr) => {
      unshieldedFunds = blockInfoArr.pop()
      _formattedUtxoList = blockInfoArr.pop()
      let i = 0

      //We go through the formatted utxo list array one more time, removing any
      //transactions that don't can't be verified by merkle root
      while (i < blockInfoArr.length) {
        if(_formattedUtxoList[i] && blockInfoArr[i] && _formattedUtxoList.length === blockInfoArr.length) {
          if (
            blockInfoArr[i].result && 
            blockInfoArr[i].result.merkle_root && 
            blockInfoArr[i].result.merkle_root === _formattedUtxoList[i].merkleRoot) {
            if (__DEV__) {
              console.log('txid ' + _formattedUtxoList[i].txid + ' verified!')
            }
            _formattedUtxoList[i].verified = true
            i++
          } else {
            if (__DEV__) {
              console.log("Couldnt verify UTXO merkle root, splicing from array:")
              console.log(_formattedUtxoList[i])
              console.log("Tried to prove with merkle root:")
              console.log(blockInfoArr[i])
            }
            
            blockInfoArr.splice(i, 1);
            _formattedUtxoList.splice(i, 1);
          } 
        }
        else {
          throw new Error("getUnspent.js: Fatal mismatch error, no utxo list item found for blockInfo or blockinfo array does not match length of uspent transaction array")
        }
      }
      resolve({
        utxoList: _formattedUtxoList,
        unshieldedFunds: unshieldedFunds
      })
    })
    .catch(err => {
      console.log(err)
      reject(err)
    })
  });
}