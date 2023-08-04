import { ethers } from "ethers"
import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ERC20, ETH } from "../../../../constants/intervalConstants"
import { scientificToDecimal } from "../../../../math"
import { requestPrivKey } from "../../../../auth/authBox"
import { ETHERS } from "../../../../constants/web3Constants"

export const send = async (coinObj, activeUser, address, amount, params) => {
  try {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network)
    
    const privKey = await requestPrivKey(coinObj.id, ERC20)
    const contract = Web3Provider.getContract(coinObj.currency_id)
    const gasPrice = await Web3Provider.DefaultProvider.getGasPrice()
    const amountBn = ethers.utils.parseUnits(scientificToDecimal(amount.toString()), coinObj.decimals)
    const signableContract = contract.connect(
      new ethers.Wallet(ethers.utils.hexlify(privKey), Web3Provider.DefaultProvider)
    );
    const gasEst = await signableContract.estimateGas.transfer(address, amountBn)
    const response = await signableContract.transfer(
      address,
      amountBn
    );

    const maxFee = gasEst.mul(gasPrice)
    
    return {
      err: false,
      result: {
        fee: Number(
          ethers.utils.formatUnits(
            maxFee,
            ETHERS
          )
        ),
        feeCurr: ETH.toUpperCase(),
        value: Number(ethers.utils.formatUnits(amountBn, coinObj.decimals)),
        toAddress: address,
        fromAddress: response.from,
        txid: response.hash,
        amountSubmitted: amount.toString(),
        memo: null,
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