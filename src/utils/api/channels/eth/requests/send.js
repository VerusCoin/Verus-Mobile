import { ethers } from "ethers"
import Web3Provider from '../../../../web3/provider'
import { ETH } from "../../../../constants/intervalConstants"
import { ETH_NETWORK_IDS } from "../../../../constants/constants"
import { ETH_NETWORK } from '../../../../../../env/main.json'
import { etherKeys } from "agama-wallet-lib/src/keys"

export const send = async (coinObj, activeUser, address, amount, params) => {
  try {
    const fromAddress = activeUser.keys[coinObj.id][ETH].addresses[0]
    const { privKey } = activeUser.keys[coinObj.id][ETH]
    const voidSigner = new ethers.VoidSigner(fromAddress, Web3Provider.DefaultProvider)

    let transaction = await voidSigner.populateTransaction({
      to: address,
      value: ethers.utils.parseUnits(amount.toString()),
      chainId: ETH_NETWORK_IDS[ETH_NETWORK]
    })

    // Change tx format to fit with ethers version used in agama-wallet-lib for standardization
    delete transaction.from

    const signedTx = await etherKeys(privKey, true).sign(transaction)

    console.log(signedTx)
    console.log(
      ethers.utils.parseTransaction(ethers.utils.hexlify(signedTx))
    );

    const response = await Web3Provider.EtherscanProvider.sendTransaction(signedTx);
    
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