import { ethers } from "ethers"
import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ERC20, ETH } from "../../../../constants/intervalConstants"
import { coinsToSats, coinsToUnits, satsToCoins, scientificToDecimal } from "../../../../math"
import {
  DAI_VETH,
  ETHERS,
  ETH_BRIDGE_NAME,
  ETH_VERUS_BRIDGE_CONTRACT_RESERVE_TRANSFER_FEE,
  VETH,
  ETH_VERUS_BRIDGE_DEST_SYSTEM_ID,
  MINIMUM_GAS_PRICE_WEI_DELEGATOR_CONTRACT,
  GAS_TRANSACTION_IMPORT_FEE,
  ETH_CONTRACT_ADDRESS,
  INITIAL_GAS_LIMIT,
  ERC20_BRIDGE_TRANSFER_GAS_LIMIT,
  FALLBACK_GAS_BRIDGE_TRANSFER,
  NULL_ETH_ADDRESS,
  ETH_VERUS_BRIDGE_CONTRACT_PRELAUNCH_RESERVE_TRANSFER_FEE,
  MKR_VETH,
  ETH_VERUS_BRIDGE_CONTRACT_RESERVE_TRANSFER_FEE_WEI,
  MINIMUM_IMPORT_FEE_WEI,
  GAS_PRICE_MODIFIER,
  DAI_CONTRACT_ADDRESS,
  DAI_BRIDGE_TRANSFER_GAS_LIMIT,
  TRANSFER_SKIP_CALLSTATIC_TOKENS
} from '../../../../constants/web3Constants';
import { getCurrency, getIdentity } from "../../verusid/callCreators"
import { getSystemNameFromSystemId } from "../../../../CoinData/CoinData"
import {
  DEST_ETH,
  DEST_ID,
  DEST_PKH,
  FLAG_DEST_AUX,
  FLAG_DEST_GATEWAY,
  RESERVE_TRANSFER_CONVERT,
  RESERVE_TRANSFER_IMPORT_TO_SOURCE,
  RESERVE_TRANSFER_RESERVE_TO_RESERVE,
  RESERVE_TRANSFER_VALID,
  TransferDestination,
  fromBase58Check,
  toBase58Check,
  toIAddress,
} from 'verus-typescript-primitives';

import BigNumber from "bignumber.js"
import { BN } from "bn.js";
import { getStandardEthBalance } from "../../eth/callCreator";
import { ECPair, networks } from "@bitgo/utxo-lib";

// TODO: Add balance recalculation with eth gas
export const txPreflight = async (coinObj, activeUser, address, amount, params) => {
  try {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network);
    
    const fromAddress = activeUser.keys[coinObj.id][ERC20].addresses[0]
    const signer = new ethers.VoidSigner(fromAddress, Web3Provider.DefaultProvider)
    const contract = Web3Provider.getContract(coinObj.currency_id).connect(signer)
    
    const amountBn = ethers.utils.parseUnits(
      scientificToDecimal(amount.toString()),
      coinObj.decimals
    );

    const gasMarketPrice = await Web3Provider.DefaultProvider.getGasPrice()
    const gasPriceModifier = ethers.BigNumber.from("3")
    const gasPrice = gasMarketPrice.add(gasMarketPrice.div(gasPriceModifier))

    const gasLimModifier = ethers.BigNumber.from("3")
    const gasEst = await contract.estimateGas.transfer(address, amountBn)
    const gasLimit = gasEst.add(gasEst.div(gasLimModifier))

    if (!(TRANSFER_SKIP_CALLSTATIC_TOKENS.some(x => (x.toLowerCase() === coinObj.currency_id.toLowerCase())))) {
      const transaction = await contract.callStatic.transfer(
        address,
        amountBn,
        { gasLimit: gasLimit.toNumber(), gasPrice }
      );
    }

    const maxFee = gasLimit.mul(gasPrice)
    
    return {
      err: false,
      result: {
        fee: ethers.utils.formatUnits(
            maxFee,
            ETHERS
          ),
        feeCurr: ETH.toUpperCase(),
        value: ethers.utils.formatUnits(amountBn, coinObj.decimals),
        toAddress: address,
        fromAddress,
        amountSubmitted: amount.toString(),
        memo: null,
        params: {
          utxoVerified: true,
          gasPrice: gasPrice,
          gasLimit: gasLimit
        },
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

export const preflightBridgeTransfer = async (coinObj, channelId, activeUser, output, fallbackSubtractBalance = true, amountSubmitted = null) => {
  try {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network);
    const activeUserKeys = activeUser.keys[coinObj.id][coinObj.proto === 'erc20' ? ERC20 : ETH]
    const fromAddress = activeUserKeys.addresses[0];
    const submittedAmount = amountSubmitted == null ? output.satoshis : amountSubmitted;

    const signer = new ethers.VoidSigner(fromAddress, Web3Provider.DefaultProvider);

    const delegatorContract = Web3Provider.getVerusBridgeDelegatorContract().connect(signer);
    const systemId = Web3Provider.getVrscSystem();
    const systemName = getSystemNameFromSystemId(systemId);
    const tokenContract = coinObj.currency_id;

    const pastPrelaunch = await delegatorContract.callStatic.bridgeConverterActive();

    const {
      currency,
      convertto,
      exportto,
      feecurrency,
      via,
      feesatoshis,
      preconvert,
      address,
      mapto,
      satoshis
    } = output;

    const isConversion = convertto != null;

    if (address.isETHAccount() && !isConversion) {
      throw new Error("Cannot send to ETH address across bridge without converting. Maybe you meant to use a Verus address?")
    } else if (address.isETHAccount() && exportto != null) {
      throw new Error("Cannot send to ETH address across bridge to non-eth network. Maybe you meant to use a Verus address?")
    }

    let mappedCurrencyIAddress;
    let isBridge = false;
    const vEthIAddress = toIAddress(VETH, systemName);
    const bridgeIAddress = toIAddress(ETH_BRIDGE_NAME, systemName);

    // Find the i address of the currency mapped to the erc20 you're sending as
    if (mapto != null) {
      // If mapto is defined, search for the currency trying to map to and get 
      // i-address
      const mappedCurrencyRes = await getCurrency(systemId, mapto);

      if (mappedCurrencyRes.error) throw new Error(mappedCurrencyRes.error.message);
      else {
        if (mappedCurrencyRes.result.fullyqualifiedname === ETH_BRIDGE_NAME) {
          isBridge = true;
        }

        mappedCurrencyIAddress = mappedCurrencyRes.result.currencyid;
      }
    } else if (isConversion) {
      if (!pastPrelaunch) {
        throw new Error("Cannot make conversions while bridge is in pre-launch phase.")
      }

      // If mapto is undefined, assume conversion and look for which convertable
      // currency is mapped to the current erc20 address
      const convertableCurrencies = coinObj.testnet ? [
        systemId,
        bridgeIAddress,
        vEthIAddress,
        toIAddress(DAI_VETH, systemName)
      ] : [
        systemId,
        bridgeIAddress,
        vEthIAddress,
        toIAddress(DAI_VETH, systemName),
        toIAddress(MKR_VETH, systemName)
      ];
      const tokenList = await delegatorContract.callStatic.getTokenList(0, 0);
      
      for (const tokenInfo of tokenList) {
        const [iAddrBytesHex, contractAddr, nftTokenId, flags] = tokenInfo;

        const iAddrBytes = Buffer.from(iAddrBytesHex.substring(2), 'hex');
        const iAddr = toBase58Check(iAddrBytes, 102);

        if (contractAddr.toLowerCase() === tokenContract.toLowerCase() && convertableCurrencies.includes(iAddr)) {
          if (bridgeIAddress === iAddr) {
            isBridge = true;
          }

          mappedCurrencyIAddress = iAddr;
          break;
        }
      }

      if (mappedCurrencyIAddress == null) {
        throw new Error("Failed to find a currency mapped to sending erc20 token that can be converted");
      }
    } else {
      throw new Error("Cannot send to Verus network without a mapped currency, please select a currency to receive as");
    }

    const toEthAddress = (iAddr) => {
      return "0x" + fromBase58Check(iAddr).hash.toString('hex');
    }

    // Turn the i-address you found into a hex address for bridge contract, this may not need to be done
    // once bridge contract accepts serialization instead of JSON
    const mappedCurrencyHexIAddress = toEthAddress(mappedCurrencyIAddress);

    // Calculate the flags for the reserve transfer
    let flagsBN = RESERVE_TRANSFER_VALID;
    let importToSource = false;
    let reserveToReserve = false;
    let isGateway = false;
    let secondreserveid;
    let destinationcurrency;
    let converterDefinition;

    // Get the vETH hex address for the fee currency
    const vEthHexAddress = toEthAddress(vEthIAddress);
    const vrscHexAddress = toEthAddress(systemId);
    const bridgeHexAddress = toEthAddress(bridgeIAddress);

    if (isConversion) {
      flagsBN = flagsBN.xor(RESERVE_TRANSFER_CONVERT);

      if (isBridge) {
        flagsBN = flagsBN.xor(RESERVE_TRANSFER_IMPORT_TO_SOURCE);
        importToSource = true;
      }

      if (via != null) {
        flagsBN = flagsBN.xor(RESERVE_TRANSFER_RESERVE_TO_RESERVE);
        reserveToReserve = true;
      }

      // Get information about conversion currency to set destinationcurrency and potentially
      // secondreserveid
      const convertToRes = await getCurrency(systemId, convertto);

      if (convertToRes.error) throw new Error(convertToRes.error.message);
      else {
        const converterDefinition = convertToRes.result;
        const finalDestinationCurrencyAddress = toEthAddress(converterDefinition.currencyid);

        if (via != null) {
          secondreserveid = finalDestinationCurrencyAddress;
        } else secondreserveid = NULL_ETH_ADDRESS;

        if (importToSource) {
          destinationcurrency = finalDestinationCurrencyAddress;
        } else {
          destinationcurrency = bridgeHexAddress;
        }
      }
    } else if (!pastPrelaunch) {
      destinationcurrency = vrscHexAddress;
      secondreserveid = NULL_ETH_ADDRESS;
    } else {
      destinationcurrency = bridgeHexAddress;
      secondreserveid = NULL_ETH_ADDRESS;
    }

    let destinationtype, destinationaddress;

    const baseGasPrice = await Web3Provider.DefaultProvider.getGasPrice();
    const minGasPrice = ethers.BigNumber.from(MINIMUM_GAS_PRICE_WEI_DELEGATOR_CONTRACT);
    const gasFeeModifier = ethers.BigNumber.from("4");
    const modifiedGasPrice = baseGasPrice.add(GAS_PRICE_MODIFIER);
    const gasPrice = modifiedGasPrice.gte(minGasPrice) ? modifiedGasPrice : minGasPrice;

    const minimumImportFee = ethers.BigNumber.from(MINIMUM_IMPORT_FEE_WEI)
    const importGasMarketFee = gasPrice.mul(ethers.BigNumber.from(GAS_TRANSACTION_IMPORT_FEE));
    const importGasFeeWei = importGasMarketFee.lt(minimumImportFee)
      ? minimumImportFee
      : importGasMarketFee;
    const importGasFeeString = ethers.utils.formatUnits(
      importGasFeeWei,
      ETHERS
    );
    const importGasFeeSatsString = coinsToSats(BigNumber(importGasFeeString)).toString();
    let approvalGasFee = ethers.BigNumber.from("0");

    if (address.isETHAccount()) {
      const refundAddress = ECPair.fromPublicKeyBuffer(
        Buffer.from(activeUserKeys.pubKey, 'hex'),
        networks.verus,
      ).getAddress();

      // Manually construct a CTransferDestination (remove when switching to serialized method from JSON)
      const destAddrBytes = address.destination_bytes;

      const destination = new TransferDestination({
        type: DEST_ETH.xor(FLAG_DEST_GATEWAY).xor(FLAG_DEST_AUX),
        destination_bytes: destAddrBytes,
        gateway_id: vEthIAddress,
        gateway_code: toBase58Check(Buffer.from(NULL_ETH_ADDRESS, 'hex'), 102),
        fees: new BN(importGasFeeSatsString),
        aux_dests: [
          new TransferDestination({
            type: DEST_PKH,
            destination_bytes: fromBase58Check(refundAddress).hash
          })
        ]
      })

      isGateway = true;
      destinationtype = destination.type.toNumber();
      destinationaddress = '0x' + destination.toBuffer().toString('hex').slice(4);
    } else {
      destinationtype = address.type.toNumber();
      destinationaddress = '0x' + address.destination_bytes.toString('hex');
    }

    const reserveTransferFee = pastPrelaunch ? ETH_VERUS_BRIDGE_CONTRACT_RESERVE_TRANSFER_FEE : ETH_VERUS_BRIDGE_CONTRACT_PRELAUNCH_RESERVE_TRANSFER_FEE

    const reserveTransfer = {
      version: 1,
      currencyvalue: { currency: mappedCurrencyHexIAddress, amount: satoshis },
      flags: flagsBN.toNumber(),
      feecurrencyid: pastPrelaunch ? vEthHexAddress : vrscHexAddress,
      fees: reserveTransferFee,
      destcurrencyid: destinationcurrency,
      secondreserveid,
      destsystemid: ETH_VERUS_BRIDGE_DEST_SYSTEM_ID,
      destination: { destinationtype, destinationaddress }
    }

    const baseFee = ethers.BigNumber.from(pastPrelaunch ? ETH_VERUS_BRIDGE_CONTRACT_RESERVE_TRANSFER_FEE_WEI : "0");

    let ethValueForContract = baseFee;
    
    if (isGateway) {
      ethValueForContract = ethValueForContract.add(importGasFeeWei);
    }

    if (coinObj.currency_id === ETH_CONTRACT_ADDRESS) {
      ethValueForContract = ethValueForContract.add(
        ethers.BigNumber.from(satoshis).mul(ethers.BigNumber.from('10000000000')),
      );
    }

    let transferGas;

    try {
      transferGas = coinObj.currency_id !== ETH_CONTRACT_ADDRESS
      ? ethers.BigNumber.from('0')
      : await delegatorContract.estimateGas.sendTransfer(reserveTransfer, {
          from: fromAddress,
          gasLimit: INITIAL_GAS_LIMIT,
          gasPrice: gasPrice,
          value: ethValueForContract.toString(),
        });
    } catch(e) {
      transferGas = ethers.BigNumber.from(FALLBACK_GAS_BRIDGE_TRANSFER);
    }

    let gasEst =
      coinObj.currency_id !== ETH_CONTRACT_ADDRESS
        ? ethers.BigNumber.from(
            coinObj.currency_id.toLowerCase() === DAI_CONTRACT_ADDRESS.toLowerCase() ? 
              DAI_BRIDGE_TRANSFER_GAS_LIMIT 
              : 
              ERC20_BRIDGE_TRANSFER_GAS_LIMIT
            )
        : transferGas.add(transferGas.div(gasFeeModifier));

    if (coinObj.currency_id !== ETH_CONTRACT_ADDRESS) {
      const contract = Web3Provider.getContract(coinObj.currency_id).connect(signer);

      approvalGasFee = (await contract.estimateGas.approve(
        delegatorContract.address,
        coinsToUnits(satsToCoins(BigNumber(satoshis)), coinObj.decimals).toString(),
        { from: fromAddress, gasLimit: INITIAL_GAS_LIMIT, gasPrice: gasPrice },
      ))
      approvalGasFee = approvalGasFee.add(approvalGasFee.div(gasFeeModifier));
      gasEst = gasEst.add(approvalGasFee)
    }

    const gasLimit = gasEst;

    const maxTotalFee = isGateway
      ? gasLimit.mul(gasPrice).add(importGasFeeWei).add(baseFee)
      : gasLimit.mul(gasPrice).add(baseFee);

    const ethBalance = coinsToSats(await getStandardEthBalance(fromAddress, Web3Provider.network));

    const maxTotalFeeSatoshis = coinsToSats(BigNumber(ethers.utils.formatEther(maxTotalFee)));
    const satoshisBn = coinObj.currency_id === ETH_CONTRACT_ADDRESS ? BigNumber(satoshis) : BigNumber(0);

    if (maxTotalFeeSatoshis.plus(satoshisBn).isGreaterThan(ethBalance)) {
      if (coinObj.currency_id === ETH_CONTRACT_ADDRESS && satoshisBn.isGreaterThan(0) && fallbackSubtractBalance) {
        const newSatoshis = satoshisBn.minus(maxTotalFeeSatoshis);

        if (newSatoshis.isGreaterThan(0)) {
          const modifiedOutput = {
            ...output,
            satoshis: newSatoshis.toString()
          }
          return preflightBridgeTransfer(coinObj, channelId, activeUser, modifiedOutput, false, satoshisBn.toString());
        }
      }

      throw new Error("Wallet does not contain enough ETH to pay maximum fee of " + (ethers.utils.formatEther(maxTotalFee)));
    }

    if (coinObj.currency_id === ETH_CONTRACT_ADDRESS) {
      // Try making sure the tx can go through
      await delegatorContract.callStatic.sendTransfer(
        reserveTransfer,
        {from: fromAddress, gasLimit: gasLimit.toNumber(), value: ethValueForContract.toString(), gasPrice: gasPrice },
      );
    }

    // result: {
    //   output,
    //   validation,
    //   hex: fundRes.result.hex,
    //   names: friendlyNames,
    //   deltas,
    //   source,
    //   inputs,
    //   converterdef: output.convertto ? currencyDefs.get(output.convertto) : output.convertto,
    //   submittedsats: submittedAmount,
    //   estimate: conversionEstimate
    // },

    const names = new Map(
      coinObj.currency_id === ETH_CONTRACT_ADDRESS
        ? [[ETH_CONTRACT_ADDRESS, 'ETH']]
        : [
            [ETH_CONTRACT_ADDRESS, 'ETH'],
            [coinObj.currency_id, coinObj.display_ticker],
          ],
    );

    const validation = { 
      valid: true,
      fees: { [ETH_CONTRACT_ADDRESS]: maxTotalFeeSatoshis.toString() },
      sent: { [coinObj.currency_id]: satoshis }
    }

    const deltas = new Map();

    for (const key in validation.sent) {
      if (deltas.has(key)) deltas.set(key, deltas.get(key).minus(BigNumber(validation.sent[key])))
      else deltas.set(key, BigNumber(validation.sent[key]).multipliedBy(BigNumber(-1)))
    }

    for (const key in validation.fees) {
      if (deltas.has(key)) deltas.set(key, deltas.get(key).minus(BigNumber(validation.fees[key])))
      else deltas.set(key, BigNumber(validation.fees[key]).multipliedBy(BigNumber(-1)))
    }
    
    return {
      err: false,
      result: {
        output,
        validation,
        names,
        deltas,
        source: fromAddress,
        submittedsats: submittedAmount,
        converterdef: converterDefinition,
        estimate: null,
        approvalparams: coinObj.currency_id === ETH_CONTRACT_ADDRESS ? null : [
          delegatorContract.address,
          coinsToUnits(satsToCoins(BigNumber(satoshis)), coinObj.decimals).toString(),
          { from: fromAddress, gasLimit: approvalGasFee.toNumber(), gasPrice: gasPrice }
        ],
        transferparams: [
          reserveTransfer,
          {from: fromAddress, gasLimit: gasLimit.sub(approvalGasFee).toNumber(), value: ethValueForContract.toString(), gasPrice: gasPrice }
        ],
        gasprice: gasPrice.toString()
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