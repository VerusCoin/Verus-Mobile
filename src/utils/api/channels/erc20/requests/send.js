import { ethers } from "ethers"
import Web3Provider from '../../../../web3/provider'
import { ERC20, ETH } from "../../../../constants/intervalConstants"

export const send = async (coinObj, activeUser, address, amount, params) => {
  try {
    const { privKey } = activeUser.keys[coinObj.id][ERC20]
    const contract = Web3Provider.getContract(coinObj.contract_address)
    const gasPrice = await Web3Provider.DefaultProvider.getGasPrice()
    const amountBn = ethers.utils.parseUnits(amount.toString(), coinObj.decimals)
    const gasEst = await contract.estimateGas.transfer(address, amountBn)
    const signableContract = contract.connect(
      new ethers.Wallet(ethers.utils.hexlify(privKey), Web3Provider.DefaultProvider)
    );
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
            coinObj.decimals
          )
        ),
        feeCurr: ETH.toUpperCase(),
        value: Number(ethers.utils.formatUnits(amountBn, coinObj.decimals)),
        toAddress: address,
        fromAddress: response.from,
        txid: response.hash,
        amountSubmitted: amount,
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