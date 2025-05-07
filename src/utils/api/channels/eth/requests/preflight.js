import { ethers } from "ethers"
import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ETH } from "../../../../constants/intervalConstants"
import { ETH_NETWORK_IDS } from "../../../../constants/constants"
import { ETH_HOMESTEAD } from '../../../../../../env/index'
import BigNumber from "bignumber.js"
import { scientificToDecimal } from "../../../../math"
import { cleanEthersErrorMessage } from "../../../../errors"
import store from "../../../../../store"
import { MINIMUM_GAS_PRICE_GWEI, ONE_GWEI_IN_WEI } from "../../../../constants/web3Constants"

export const txPreflight = async (coinObj, activeUser, address, amount, params) => {
  try {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network)

    const { minGasPriceGwei } = store.getState().settings.generalWalletSettings;
    const minGasPrice = minGasPriceGwei != null ? 
          ethers.BigNumber.from(minGasPriceGwei).mul(ONE_GWEI_IN_WEI) 
          : 
          ethers.BigNumber.from(MINIMUM_GAS_PRICE_GWEI).mul(ONE_GWEI_IN_WEI);
    
    const fromAddress = activeUser.keys[coinObj.id][ETH].addresses[0]
    const signer = new ethers.VoidSigner(fromAddress, Web3Provider.InfuraProvider)
    const balance = await signer.getBalance()
    const value = ethers.utils.parseUnits(scientificToDecimal(amount.toString()))

    const transaction = await signer.populateTransaction({
      to: address,
      from: fromAddress,
      value,
      chainId: ETH_NETWORK_IDS[coinObj.network ? coinObj.network : ETH_HOMESTEAD],
      gasLimit: ethers.BigNumber.from(42000)
    })

    if (transaction.to == null) {
      throw new Error(`"${address}" is not a valid destination.`)
    }

    if (transaction.gasPrice.lt(minGasPrice)) {
      transaction.gasPrice = minGasPrice;
    }

    const maxFee = transaction.gasLimit.mul(transaction.gasPrice)
    const maxValue = maxFee.add(value)

    if (maxValue.gt(balance)) {
      const adjustedValue = value.sub(maxFee)

      if (adjustedValue.lt(ethers.BigNumber.from(0)))
        throw new Error(
          `Insufficient funds, cannot cover fee costs of at least ${ethers.utils.formatUnits(maxFee)} ETH.`
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
          gasPrice: transaction.gasPrice,
          gasLimit: transaction.gasLimit
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