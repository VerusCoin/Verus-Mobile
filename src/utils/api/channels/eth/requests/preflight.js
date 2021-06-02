import { ethers } from "ethers"
import Web3Provider from '../../../../web3/provider'
import { ETH } from "../../../../constants/intervalConstants"
import { ETH_NETWORK_IDS } from "../../../../constants/constants"
import { ETH_NETWORK } from '../../../../../../env/index'
import BigNumber from "bignumber.js"
import { scientificToDecimal } from "../../../../math"

export const txPreflight = async (coinObj, activeUser, address, amount, params) => {
  try {
    const fromAddress = activeUser.keys[coinObj.id][ETH].addresses[0]
    const signer = new ethers.VoidSigner(fromAddress, Web3Provider.DefaultProvider)
    const balance = await signer.getBalance()
    const value = ethers.utils.parseUnits(scientificToDecimal(amount.toString()))

    const transaction = await signer.populateTransaction({
      to: address,
      from: fromAddress,
      value,
      chainId: ETH_NETWORK_IDS[ETH_NETWORK],
      gasLimit: ethers.BigNumber.from(21000)
    })

    if (transaction.to == null) {
      throw new Error(`"${address}" is not a valid destination.`)
    }

    const maxFee = transaction.gasLimit.mul(transaction.gasPrice)
    const maxValue = maxFee.add(value)

    if (maxValue.gt(balance)) {
      const adjustedValue = value.sub(maxFee)

      if (adjustedValue.lt(ethers.BigNumber.from(0)))
        throw new Error(
          `Insufficient funds, cannot cover fee costs of at least ${maxFee} ETH.`
        );
      else
        return await txPreflight(
          coinObj,
          activeUser,
          address,
          BigNumber(ethers.utils.formatUnits(adjustedValue)),
          {
            ...params,
            feeTakenFromAmount: true,
            amountSubmitted:
              params.amountSubmitted != null
                ? params.amountSubmitted
                : amount,
          }
        );
    }
    
    return {
      err: false,
      result: {
        fee: ethers.utils.formatUnits(
            transaction.gasLimit.mul(transaction.gasPrice)
          ),
        value: ethers.utils.formatUnits(transaction.value),
        toAddress: transaction.to,
        fromAddress: transaction.from,
        amountSubmitted:
          params.amountSubmitted != null ? params.amountSubmitted : amount,
        memo: null,
        params: {
          utxoVerified: true,
          feeTakenFromAmount: params.feeTakenFromAmount ? true : false,
        },
      },
    };
  } catch(e) {
    return {
      err: true,
      result: e.message
    }
  }
}