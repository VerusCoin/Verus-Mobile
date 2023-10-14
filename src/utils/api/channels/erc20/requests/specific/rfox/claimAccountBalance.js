import { RFOX_UTILITY_CONTRACT } from "../../../../../../constants/web3Constants"
import { getWeb3ProviderForNetwork } from "../../../../../../web3/provider"
import { computePublicKey } from '@ethersproject/signing-key'
import { ethers } from "ethers"

/**
 * Estimates the gas required to claim the account balance of an RFOX account
 * @param {String} pubKey The public key that is stored in the accountObj of the user 
 */
export const estimateGasClaimRFoxAccountBalances = async (pubKey, fromAddress) => {
  const Web3Provider = getWeb3ProviderForNetwork('homestead')

  let contract = null
  const signer = new ethers.VoidSigner(fromAddress, Web3Provider.DefaultProvider)
  
  try {
    contract = Web3Provider.getContract(RFOX_UTILITY_CONTRACT)
  } catch(e) {
    await Web3Provider.initContract(RFOX_UTILITY_CONTRACT)
    contract = Web3Provider.getContract(RFOX_UTILITY_CONTRACT)
  }
  
  const uncompressedPubKey = computePublicKey(Buffer.from(pubKey, 'hex'))

  const x = Buffer.from(uncompressedPubKey.slice(4, 68), 'hex')
  const y = Buffer.from(uncompressedPubKey.slice(68), 'hex')

  return (await contract.connect(signer).estimateGas.withdrawBalance(x, y)).mul(await Web3Provider.DefaultProvider.getGasPrice())
}

/**
 * Claims claimable account balance of a RedFOX account
 * @param {String} privKey The private key that is stored in the accountObj of the user 
 * @param {String} pubKey The public key that is stored in the accountObj of the user 
 */
export const claimRFoxAccountBalances = async (privKey, pubKey) => {
  const Web3Provider = getWeb3ProviderForNetwork('homestead')
  
  let contract = null
  
  try {
    contract = Web3Provider.getContract(RFOX_UTILITY_CONTRACT)
  } catch(e) {
    await Web3Provider.initContract(RFOX_UTILITY_CONTRACT)
    contract = Web3Provider.getContract(RFOX_UTILITY_CONTRACT)
  }

  const signableContract = contract.connect(
    new ethers.Wallet(ethers.utils.hexlify(privKey), Web3Provider.DefaultProvider)
  );
  
  const uncompressedPubKey = computePublicKey(Buffer.from(pubKey, 'hex'))

  const x = Buffer.from(uncompressedPubKey.slice(4, 68), 'hex')
  const y = Buffer.from(uncompressedPubKey.slice(68), 'hex')

  return await signableContract.withdrawBalance(x, y)
}