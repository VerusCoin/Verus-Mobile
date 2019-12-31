import { updateValues, getMerkleRoot, getBlockInfo } from '../callCreators'
import { getOneTransaction } from './getTransaction'
import { TxDecoder } from '../../crypto/txDecoder'
import { hashRawTx, hexHashToDecimal } from '../../crypto/hash'
import { arraysEqual } from '../../objectManip'
import { resolveSequentially } from '../../promises'
import { networks } from 'bitgo-utxo-lib'
import { coinsToSats, satsToCoins, kmdCalcInterest, truncateDecimal } from '../../math'

export const getUnspent = (oldList, coinObj, activeUser) => {
  const callType = 'listunspent'
  let params = {}
  const coinID = coinObj.id

  if (activeUser.keys.hasOwnProperty(coinObj.id)) {
    params.address = activeUser.keys[coinObj.id].pubKey
  } else {
    throw new Error("getUnspent.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + coinID + " not found!")
  }

  return new Promise((resolve, reject) => {
    updateValues(oldList, coinObj.serverList, callType, params, coinID)
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

/**
 * @param {Array} oldList (Optional) The last used unspent utxo list 
 * @param {Object} coinObj The coin object for the coin being used for getUnspent. Includes coin servers and coin id.
 * @param {Object} activeUser The current active user object. Includes public address.
 * @param {Boolean} verifyMerkle (Default: false) Choose whether or not to call getMerkle on each utxo in the utxo list. 
 * This allows verification of the merkle root for the block of each transaction, and enhances security, but can 
 * be a performance issue for addresses with large amounts of utxos. Without this, coinbases will be unrecognizable.
 * @param {Boolean} verifyTxid (Default: false) Choose whether or not to verify the txid of a transaction by hashing it's 
 * transaction data (calls getTransaction on each utxo). This improves security, 
 * and prevents a server from feeding false txids to the client, but can be a performance issue for addresses with more utxos. 
 * (This is always true if the coin being used is KMD and overrideKmdInterest is false, 
 * as getTransaction is needed to determine interest)
 * @param {Boolean} overrideKmdInterest (Default: false) Optionally override KMD interest calculations and don't call gettransaction
 * on utxos to calculate locktime. (WILL RESULT IN LOSS OF INTEREST IF KMD TRANSACTION IS SENT WITH THIS ENABLED)
 */
export const getUnspentFormatted = (oldList, coinObj, activeUser, verifyMerkle = false, verifyTxid = false, overrideKmdInterest = false) => {
  const network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']
  
  let formattedUtxos = []
  let firstServer
  let currentHeight
  let unshieldedFunds = null

  /*if (__DEV__) {
    if (verifyMerkle) {
      console.log("verifyMerkle is true, going to verify merkle roots")
    }

    if (verifyTxid) {
      console.log("verifyTxid is true, going to verify txids")
    } else if (coinObj.id === 'KMD' && !overrideKmdInterest) {
      console.log("verifyTxid is false but overrideKmdInterest is false as well and the coin is KMD, so still going to verify txid to fetch data for interest calculation")
    }

    if (overrideKmdInterest) {
      console.log("overridekmdinterest is true, going to override kmd interest calculations")
    }
  }*/
  

  return new Promise((resolve, reject) => {
    getUnspent(oldList, coinObj, activeUser)
    .then(getUnspentRes => {
      firstServer = getUnspentRes.serverUsed
      currentHeight = getUnspentRes.blockHeight
      let _utxoList = getUnspentRes.result
      let getTxArr = []

      if (!_utxoList.length) throw new Error("No valid utxo")

      _utxoList.forEach((_utxoItem, index) => {
        if(Number(currentHeight) - Number(_utxoItem.height) !== 0) {
          formattedUtxos.push({
            txid: _utxoItem['tx_hash'],
            vout: _utxoItem['tx_pos'],
            address: activeUser.keys[coinObj.id].pubKey,
            amountSats: _utxoItem.value,
            blockHeight: _utxoItem.height,
            interestSats: 0,
            confirmations: Number(_utxoItem.height) === 0 ? 0 : currentHeight - _utxoItem.height,
            verifiedMerkle: false,
            verifiedTxid: false,
            merkleRoot: null
          })

          if (verifyTxid || (!verifyTxid && coinObj.id === 'KMD' && !overrideKmdInterest)) {
            getTxArr.push(getOneTransaction(null, coinObj, _utxoItem.tx_hash))
          }
        }
      })

      if (formattedUtxos.length === 0) throw new Error("No confirmed utxos")

      return resolveSequentially(getTxArr)
    })
    .then(getTxsRes => {
      let getMerkleArr = []

      if (getTxsRes.length !== 0 && getTxsRes.length !== formattedUtxos.length) {
        throw new Error("Fatal mismatch error, couldn't fetch raw transactions for all UTXOs. If you just sent a transaction, try waiting a few minutes and sending again.")
      }

      formattedUtxos.forEach((formattedUtxo, index) => {
        if (getTxsRes[index]) {
          if (!arraysEqual(hashRawTx(getTxsRes[index].result, network), hexHashToDecimal(formattedUtxo.txid))) {
            throw new Error(
              'Mismatch error! At least one transaction ID provided by server ' + JSON.stringify(firstServer) + 
              ' does not match the values of the transaction that it represents! This could indicate that the server is malicious, and this transaction has been canceled.')
          } 
          formattedUtxos[index].verifiedTxid = true

          //Calculate interest to claim when transaction is sent
          if (coinObj.id === 'KMD') {
            const decodedTx = TxDecoder(getTxsRes[index].result, network)

            if (!decodedTx) throw new Error('Can\'t decode transaction')

            if (satsToCoins(Number(formattedUtxo.amountSats)) >= 10 &&
                decodedTx.format.locktime > 0) {
              interest = kmdCalcInterest(decodedTx.format.locktime, formattedUtxo.amountSats)
              formattedUtxos[index].interestSats = coinsToSats(truncateDecimal(interest, 8))
            }
          }
        }

        if (verifyMerkle) {
          getMerkleArr.push(
            getMerkleRoot(
              null,
              coinObj,
              formattedUtxo.txid,
              formattedUtxo.blockHeight,
              [firstServer]
            )
          )
        }
      })

      return resolveSequentially(getMerkleArr)
    })
    .then(getMerkleRes => {
      let blockInfoArr = []

      let i = 0
      while (i < getMerkleRes.length) {
        if(formattedUtxos[i] && getMerkleRes[i] && formattedUtxos.length === getMerkleRes.length) {
          if (
            getMerkleRes[i].result && 
            getMerkleRes[i].result.root && 
            Number(getMerkleRes[i].result.index) > 0) {
            formattedUtxos[i].merkleRoot = getMerkleRes[i].result.root

            blockInfoArr.push(getBlockInfo(null, coinObj, getMerkleRes[i].result.height))
            i++
          } else {
            if (coinObj.id === 'VRSC') unshieldedFunds += formattedUtxos[i].amountSats
            getMerkleRes.splice(i, 1);
            formattedUtxos.splice(i, 1);
          } 
        }
        else if (!getMerkleRes[i]) {
          throw new Error("getUnspent.js: Fatal mismatch error, no utxo list found for verified merkle root or length of verified merkle root array does not match length of uspent transaction array. If you just sent a transaction, try waiting a few minutes and sending again.")
        } else {
          throw new Error("Server error, unable to crosscheck merkle root across multiple electrum servers.")
        }
      }

      return resolveSequentially(blockInfoArr)
    })
    .then(blockInfoRes => {
      let i = 0
      while (i < blockInfoRes.length) {
        if(formattedUtxos[i] && blockInfoRes[i] && formattedUtxos.length === blockInfoRes.length) {
          if (
            blockInfoRes[i].result && 
            blockInfoRes[i].result.merkle_root && 
            blockInfoRes[i].result.merkle_root === formattedUtxos[i].merkleRoot) {
            formattedUtxos[i].verifiedMerkle = true
            i++
          } else {
            if (__DEV__) {
              console.log("Couldnt verify UTXO merkle root, splicing from array:")
              console.log(formattedUtxos[i])
              console.log("Tried to prove with merkle root:")
              console.log(blockInfoRes[i])
            }
            
            blockInfoRes.splice(i, 1);
            formattedUtxos.splice(i, 1);
          }
        }
        else {
          throw new Error("getUnspent.js: Fatal mismatch error, no utxo list item found for blockInfo or blockinfo array does not match length of uspent transaction array")
        }
      }

      resolve({
        utxoList: formattedUtxos,
        unshieldedFunds: unshieldedFunds //This will always be zero if verifyMerkle is false
      })
    })
    .catch(err => {
      console.log(err)
      reject(err)
    })
  });
}