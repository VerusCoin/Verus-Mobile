import { ethers } from "ethers"
import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ETH } from "../../../../constants/intervalConstants"
import { ETH_NETWORK_IDS } from "../../../../constants/constants"
import { ETH_HOMESTEAD } from '../../../../../../env/index'
import { scientificToDecimal } from "../../../../math"
import { requestPrivKey } from "../../../../auth/authBox"
import { cleanEthersErrorMessage } from "../../../../errors"

export const send = async (coinObj, activeUser, address, amount, passthrough) => {
  try {
    /** @type {BigInt} */
    const maxFeePerGas = passthrough.params.maxFeePerGas;

    /** @type {BigInt} */
    const gasLimit = passthrough.params.gasLimit;

    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network)

    const fromAddress = activeUser.keys[coinObj.id][ETH].addresses[0]
    const privKey = await requestPrivKey(coinObj.id, ETH)
    const voidSigner = new ethers.VoidSigner(fromAddress, Web3Provider.InfuraProvider)
    const signer = new ethers.Wallet(
      privKey,
      Web3Provider.InfuraProvider
    );

    let transaction = await voidSigner.populateTransaction({
      to: address,
      value: ethers.parseUnits(scientificToDecimal(amount.toString())),
      chainId: ETH_NETWORK_IDS[coinObj.network ? coinObj.network : ETH_HOMESTEAD],
      gasLimit: gasLimit,
      maxFeePerGas
    })

    const response = await signer.sendTransaction(transaction);
    
    return {
      err: false,
      result: {
        fee: Number(
          ethers.formatUnits(
            BigInt(transaction.gasLimit) * BigInt(transaction.maxFeePerGas)
          )
        ),
        value: Number(ethers.formatUnits(response.value)),
        toAddress: response.to,
        fromAddress: response.from,
        txid: response.hash,
        params: {
          utxoVerified: true,
        },
      },
    };
  } catch(e) {
    return {
      err: true,
      result: cleanEthersErrorMessage(e.message, e.body)
    }
  }
}