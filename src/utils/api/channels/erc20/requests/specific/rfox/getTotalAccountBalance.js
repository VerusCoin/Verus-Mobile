import { RFOX_UTILITY_CONTRACT } from "../../../../../../constants/web3Constants"
import Web3Provider from "../../../../../../web3/provider"
import { computePublicKey } from '@ethersproject/signing-key'

/**
 * Gets total account balance of a RedFOX account
 * @param {String} pubKey The public key that is stored in the accountObj of the user 
 */
export const getRfoxAccountBalances = async (pubKey) => {
  let contract = null 
  
  try {
    contract = Web3Provider.getContract(RFOX_UTILITY_CONTRACT)
  } catch(e) {
    await Web3Provider.initContract(RFOX_UTILITY_CONTRACT)
    contract = Web3Provider.getContract(RFOX_UTILITY_CONTRACT)
  }
  
  const uncompressedPubKey = computePublicKey(Buffer.from(pubKey, 'hex'))

  const x = Buffer.from(uncompressedPubKey.slice(4, 68), 'hex')
  const y = Buffer.from(uncompressedPubKey.slice(68), 'hex')

  return await contract.totalAccountBalance(x, y)
}