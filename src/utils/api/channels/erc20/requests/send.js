import { ethers } from "ethers"
import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ERC20, ETH } from "../../../../constants/intervalConstants"
import { scientificToDecimal } from "../../../../math"
import { requestPrivKey } from "../../../../auth/authBox"
import { ETHERS, ETH_CONTRACT_ADDRESS } from "../../../../constants/web3Constants"

export const send = async (coinObj, activeUser, address, amount, passthrough) => {
  try {
    const gasPrice = passthrough.params.gasPrice
    const gasLimit = passthrough.params.gasLimit
    const maxFeeAllowed = gasPrice.mul(gasLimit);

    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network)
    
    const privKey = await requestPrivKey(coinObj.id, ERC20);
    const contract = Web3Provider.getContract(coinObj.currency_id)
    const currentGasPrice = await Web3Provider.DefaultProvider.getGasPrice()

    const amountBn = ethers.utils.parseUnits(scientificToDecimal(amount.toString()), coinObj.decimals)
    const signableContract = contract.connect(
      new ethers.Wallet(ethers.utils.hexlify(privKey), Web3Provider.DefaultProvider)
    );
    const gasEst = await signableContract.estimateGas.transfer(address, amountBn)
    
    const estFee = gasEst.mul(currentGasPrice);

    if (estFee.gt(maxFeeAllowed)) {
      throw new Error("Estimated fee exceeds maximum fee calculated in confirm step. Try sending again to recalculate fee.")
    }

    const response = await signableContract.transfer(
      address,
      amountBn,
      { gasLimit: gasLimit.toNumber(), gasPrice: ethers.utils.parseUnits(gasPrice.toString(), 'gwei') }
    );
    
    return {
      err: false,
      result: {
        fee: Number(
          ethers.utils.formatUnits(
            maxFeeAllowed,
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

export const sendBridgeTransfer = async (coinObj, [reserveTransfer, transferOptions], approvalParams, maxGasPrice) => {
  try {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network);

    const privKey = await requestPrivKey(coinObj.id, coinObj.proto);
    const signer = new ethers.Wallet(ethers.utils.hexlify(privKey), Web3Provider.DefaultProvider);
    const gasPrice = await Web3Provider.DefaultProvider.getGasPrice();
    const maxGasPriceBn = ethers.BigNumber.from(maxGasPrice);

    const delegatorContract = Web3Provider.getVerusBridgeDelegatorContract().connect(signer);

    if (gasPrice.gt(maxGasPriceBn)) {
      throw new Error("Current gas price exceeds maximum confirmed value, try re-entering form data and sending again.")
    }

    if (coinObj.currency_id !== ETH_CONTRACT_ADDRESS) {
      const [delegatorAddress, approvalAmount, approvalOptions] = approvalParams
      const contract = Web3Provider.getContract(coinObj.currency_id).connect(signer);

      const approval = await contract.approve(delegatorContract.address, approvalAmount, approvalOptions);
      const reply = await approval.wait();

      if (reply.status === 0) {
        throw new Error("Authorising ERC20 token spend failed, please check your balance.");
      }
    }

    const response = await delegatorContract.sendTransfer(
      reserveTransfer,
      transferOptions
    );
    
    return {
      err: false,
      result: {
        txid: response.hash
      },
    };
  } catch(e) {
    console.error(e)

    return {
      err: true,
      result: e.message
    }
  }
}