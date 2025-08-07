import { ethers } from "ethers"
import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ETH } from "../../../../constants/intervalConstants"
import { ETH_NETWORK_IDS } from "../../../../constants/constants"
import { ETH_HOMESTEAD } from '../../../../../../env/index'
import { scientificToDecimal } from "../../../../math"
import { cleanEthersErrorMessage } from "../../../../errors"
import store from "../../../../../store"
import { MINIMUM_GAS_PRICE_GWEI, ONE_GWEI_IN_WEI } from "../../../../constants/web3Constants"

export const txPreflight = async (coinObj, activeUser, address, amount, params) => {
  try {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network)

    const { minGasPriceGwei } = store.getState().settings.generalWalletSettings;
    const minGasPrice = minGasPriceGwei != null ? 
          BigInt(minGasPriceGwei) * ONE_GWEI_IN_WEI
          : 
          BigInt(MINIMUM_GAS_PRICE_GWEI) * ONE_GWEI_IN_WEI;
    
    const fromAddress = activeUser.keys[coinObj.id][ETH].addresses[0]
    const signer = new ethers.VoidSigner(fromAddress, Web3Provider.InfuraProvider)
    const balance = await Web3Provider.InfuraProvider.getBalance(fromAddress)
    const value = ethers.parseUnits(scientificToDecimal(typeof amount === 'string' ? amount : amount.toString()))

    const transaction = await signer.populateTransaction({
      to: address,
      from: fromAddress,
      value,
      chainId: ETH_NETWORK_IDS[coinObj.network ? coinObj.network : ETH_HOMESTEAD],
      gasLimit: BigInt(42000)
    })

    if (transaction.to == null) {
      throw new Error(`"${address}" is not a valid destination.`)
    }

    if (transaction.gasLimit == null || transaction.maxFeePerGas == null) {
      throw new Error('Unable to get gas info from preflight transaction')
    }

    if (transaction.maxFeePerGas < minGasPrice) {
      transaction.maxFeePerGas = minGasPrice;
    }

    const gasLimitBn = BigInt(transaction.gasLimit)
    const maxFeePerGasBn = BigInt(transaction.maxFeePerGas)

    const maxFee = gasLimitBn * maxFeePerGasBn
    const maxValue = maxFee + value

    if (maxValue > balance) {
      const adjustedValue = value - maxFee

      if (adjustedValue < BigInt(0))
        throw new Error(
          `Insufficient funds, cannot cover fee costs of at least ${ethers.formatUnits(maxFee)} ETH.`
        );
      else {
        return await txPreflight(
          coinObj,
          activeUser,
          address,
          ethers.formatUnits(adjustedValue),
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
    }
    
    return {
      err: false,
      result: {
        fee: ethers.formatUnits(maxFee),
        value: ethers.formatUnits(transaction.value),
        toAddress: transaction.to,
        fromAddress: transaction.from,
        amountSubmitted: params.amountSubmitted != null ? params.amountSubmitted : amount,
        memo: null,
        params: {
          utxoVerified: true,
          feeTakenFromAmount: params.feeTakenFromAmount ? true : false,
          maxFeePerGas: maxFeePerGasBn,
          gasLimit: gasLimitBn
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