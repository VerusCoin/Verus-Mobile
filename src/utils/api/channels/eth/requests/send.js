import { ethers } from "ethers"
import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ETH } from "../../../../constants/intervalConstants"
import { ETH_NETWORK_IDS } from "../../../../constants/constants"
import { ETH_HOMESTEAD } from '../../../../../../env/index'
import { scientificToDecimal } from "../../../../math"
import { requestPrivKey } from "../../../../auth/authBox"

export const send = async (coinObj, activeUser, address, amount, params) => {
  try {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network)

    const fromAddress = activeUser.keys[coinObj.id][ETH].addresses[0]
    const privKey = await requestPrivKey(coinObj.id, ETH)
    const voidSigner = new ethers.VoidSigner(fromAddress, Web3Provider.DefaultProvider)
    const signer = new ethers.Wallet(
      privKey,
      Web3Provider.InfuraProvider
    );

    let transaction = await voidSigner.populateTransaction({
      to: address,
      value: ethers.utils.parseUnits(scientificToDecimal(amount.toString())),
      chainId: ETH_NETWORK_IDS[coinObj.network ? coinObj.network : ETH_HOMESTEAD],
      gasLimit: ethers.BigNumber.from(42000)
    })

    const response = await signer.sendTransaction(transaction);
    
    return {
      err: false,
      result: {
        fee: Number(
          ethers.utils.formatUnits(
            transaction.gasLimit.mul(transaction.gasPrice)
          )
        ),
        value: Number(ethers.utils.formatUnits(response.value)),
        toAddress: response.to,
        fromAddress: response.from,
        txid: response.hash,
        params: {
          utxoVerified: true,
        },
      },
    };
  } catch(e) {
    console.error(e)

    return {
      err: true,
      result: e.message.includes('processing response error') ? "Error creating transaction" : e.message
    }
  }
}