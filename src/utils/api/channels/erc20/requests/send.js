import { ethers } from "ethers"
import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ERC20, ETH } from "../../../../constants/intervalConstants"
import { scientificToDecimal } from "../../../../math"
import { requestPrivKey } from "../../../../auth/authBox"
import { ETHERS, ETH_CONTRACT_ADDRESS } from "../../../../constants/web3Constants"
import { cleanEthersErrorMessage } from "../../../../errors"

export const send = async (coinObj, activeUser, address, amount, passthrough) => {
  try {
    /** @type {BigInt} */
    const maxFeePerGas = passthrough.params.maxFeePerGas;

    /** @type {BigInt} */
    const gasLimit = passthrough.params.gasLimit;

    const maxFeeAllowed = maxFeePerGas * gasLimit;

    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network)
    
    const privKey = await requestPrivKey(coinObj.id, ERC20);
    const contract = Web3Provider.getContract(coinObj.currency_id);
    const currentMaxFeePerGas = (await Web3Provider.InfuraProvider.getFeeData()).maxFeePerGas;

    if (currentMaxFeePerGas == null) throw new Error("Couldn't get current gas price");

    const amountBn = ethers.parseUnits(scientificToDecimal(amount.toString()), coinObj.decimals)
    const signableContract = contract.connect(
      new ethers.Wallet(ethers.hexlify(privKey), Web3Provider.InfuraProvider)
    );
    const gasEst = BigInt(await signableContract.transfer.estimateGas(address, amountBn))
    
    const estFee = gasEst * currentMaxFeePerGas;

    if (estFee > maxFeeAllowed) {
      throw new Error("Estimated fee exceeds maximum fee calculated in confirm step. Try sending again to recalculate fee.")
    }

    const response = await signableContract.transfer(
      address,
      amountBn,
      { gasLimit: gasLimit, maxFeePerGas: maxFeePerGas }
    );
    
    return {
      err: false,
      result: {
        fee: Number(
          ethers.formatUnits(
            maxFeeAllowed,
            ETHERS
          )
        ),
        feeCurr: ETH.toUpperCase(),
        value: Number(ethers.formatUnits(amountBn, coinObj.decimals)),
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
    return {
      err: true,
      result: cleanEthersErrorMessage(e.message, e.body)
    }
  }
}

export const sendBridgeTransfer = async (coinObj, [reserveTransfer, transferOptions], approvalParams, maxGasPrice) => {
  try {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network);

    const privKey = await requestPrivKey(coinObj.id, coinObj.proto);
    const signer = new ethers.Wallet(ethers.hexlify(privKey), Web3Provider.InfuraProvider);
    const maxFeePerGas = (await Web3Provider.InfuraProvider.getFeeData()).maxFeePerGas;

    if (maxFeePerGas == null) throw new Error("Couldn't get current gas price");

    const maxGasPriceBn = BigInt(maxGasPrice)

    const delegatorContract = Web3Provider.getVerusBridgeDelegatorContract(Web3Provider.InfuraProvider).connect(signer);
    const delegatorContractAddress = await delegatorContract.getAddress()

    if (maxFeePerGas > maxGasPriceBn) {
      throw new Error("Current gas price exceeds maximum confirmed value, try re-entering form data and sending again.")
    }

    if (coinObj.currency_id !== ETH_CONTRACT_ADDRESS) {
      const [delegatorAddress, approvalAmount, approvalOptions] = approvalParams
      const contract = Web3Provider.getContract(coinObj.currency_id, null, Web3Provider.InfuraProvider).connect(signer);

      const approval = await contract.approve(delegatorContractAddress, approvalAmount, approvalOptions);
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
    return {
      err: true,
      result: cleanEthersErrorMessage(e.message)
    }
  }
}