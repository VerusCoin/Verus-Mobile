import BigNumber from "bignumber.js";
import { getAddressBalances } from "./getAddressBalances";
import { coinsToSats, satsToCoins } from "../../../../math";
import { DEST_ID, DEST_PKH, ReserveTransfer, TransferDestination, fromBase58Check, toIAddress } from "verus-typescript-primitives";
import { Transaction, networks, smarttxs } from "@bitgo/utxo-lib";
import { calculateCurrencyTransferFee } from "./calculateCurrencyTransferFee";
import { getInfo } from "./getInfo";
import { fundRawTransaction } from "./fundRawTransaction";
import { getAddressUtxos, getSpendableUtxos } from "./getAddressUtxos";
import { getCurrency, getIdentity } from "../../verusid/callCreators";
import { getSystemNameFromSystemId } from "../../../../CoinData/CoinData";
import { estimateConversion } from "./estimateConversion";
import { IS_FRACTIONAL_FLAG } from "../../../../constants/currencies";
import { unpackOutput } from "@bitgo/utxo-lib/dist/src/smart_transactions";
import { coinsList } from "../../../../CoinData/CoinsList";
import { getSendCurrencyTransaction } from "./getSendCurrencyTransaction";
import { I_ADDRESS_VERSION, R_ADDRESS_VERSION } from "../../../../constants/constants";
import { VETH } from "../../../../constants/web3Constants";
const { createUnfundedCurrencyTransfer, validateFundedCurrencyTransfer } = smarttxs

//TODO: Calculate fee for each coin seperately
export const preflight = async (coinObj, activeUser, address, amount, params, channelId) => {
  try {
    const [channelName, iAddress, systemId] = channelId.split('.')
    
    const selectAddress = async (addr) => {
      let keyhash;

      if (addr.endsWith("@")) {
        const identityRes = await getIdentity(systemId, addr);

        if (identityRes.error) throw new Error("Failed to fetch " + addr);

        keyhash = identityRes.result.identity.identityaddress;
      } else keyhash = addr;

      const { hash, version } = fromBase58Check(keyhash);
      let type;

      if (version === R_ADDRESS_VERSION) type = DEST_PKH;
      else if (version === I_ADDRESS_VERSION) type = DEST_ID;
      else throw new Error("Incompatible address type.");

      return new TransferDestination({
        destination_bytes: hash,
        type
      })
    }

    const preflightRes = await preflightCurrencyTransfer(coinObj, channelId, activeUser, {
      currency: coinObj.currency_id,
      address: await selectAddress(address),
      satoshis: coinsToSats(BigNumber(amount)).toString()
    })

    if (preflightRes.err) return preflightRes;

    const { validation, source } = preflightRes.result;
    const { sent, fees } = validation;
    let valueBn = BigNumber(0);
    let feeBn = BigNumber(0);

    for (const currencyid in sent) {
      const amountSent = BigNumber(sent[currencyid])

      if (currencyid === coinObj.currency_id) {
        valueBn = amountSent;
      } else if (amountSent.isGreaterThan(BigNumber(0))) {
        throw new Error("Cannot send " + currencyid + " in tx meant to be sending " + coinObj.display_ticker);
      }
    }

    for (const currencyid in fees) {
      const feePaid = BigNumber(fees[currencyid]);

      if (currencyid === systemId) {
        feeBn = feePaid;
      } else if (feePaid.isGreaterThan(BigNumber(0))) {
        throw new Error(
          'Cannot pay fee in ' +
            currencyid +
            ' in tx meant to be paying fee in system currency ' +
            systemId,
        );
      }
    }

    return {
      err: false,
      result: {
        fee: satsToCoins(feeBn).toString(),
        feeCurr:
          systemId === 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV' ||
          systemId === 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'
              ? getSystemNameFromSystemId(systemId)
              : systemId,
        value: satsToCoins(valueBn).toString(),
        toAddress: address,
        fromAddress: source,
        amountSubmitted: amount.toString(),
        names: preflightRes.result.names,
        hex: preflightRes.result.hex,
        inputs: preflightRes.result.inputs,
        params: {
          feeTakenFromAmount: preflightRes.result.submittedsats !== preflightRes.result.output.satoshis,
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

export const validateCurrencyTransferOutputParams = obj => {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Input must be an object');
  }

  const requiredKeys = ['currency', 'satoshis', 'address'];
  const optionalKeys = [
    'convertto',
    'exportto',
    'feecurrency',
    'via',
    'feesatoshis',
    'refundto',
    'preconvert',
    'burn',
    'burnweight',
    'mintnew',
    'mapto'
  ];
  const allKeys = [...requiredKeys, ...optionalKeys];

  // Check if all required keys are present
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      throw new Error(`Missing required key: ${key}`);
    }
  }

  // Check if all keys in the object are valid
  for (const key in obj) {
    if (!allKeys.includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }
  }

  // Check if all values are of the correct type
  for (const key in obj) {
    if (
      typeof obj[key] !== 'string' &&
      key !== 'address' &&
      key !== 'refundto' &&
      key !== 'preconvert' &&
      key !== 'burn' &&
      key !== 'burnweight' &&
      key !== 'mintnew'
    ) {
      throw new Error(`Invalid type for key ${key}: expected string`);
    }

    if (key === 'address' || key === 'refundto') {
      if (!(obj[key] instanceof TransferDestination)) {
        throw new Error(`Invalid type for key ${key}: expected TransferDestination`);
      }
    }

    if (
      key === 'preconvert' ||
      key === 'burn' ||
      key === 'burnweight' ||
      key === 'mintnew'
    ) {
      if (typeof obj[key] !== 'boolean') {
        throw new Error(`Invalid type for key ${key}: expected boolean`);
      }
    }
  }

  // If we made it here, the object is valid
  return true;
};


export const preflightCurrencyTransfer = async (coinObj, channelId, activeUser, output) => {
  let source;
  const submittedAmount = output.satoshis;

  const [channelName, iAddress, systemId] = channelId.split('.');
  
  if (
    activeUser.keys[coinObj.id] != null &&
    activeUser.keys[coinObj.id][channelId] != null &&
    activeUser.keys[coinObj.id][channelId].addresses.length > 0
  ) {
    source = activeUser.keys[coinObj.id][channelId].addresses[0];
  } else {
    return {
      err: true,
      result:
        'Error, ' +
        activeUser.id +
        ' user keys for active coin ' +
        coinObj.display_ticker +
        ' not found!',
    };
  }

  const friendlyNames = new Map();
  const currencyDefs = new Map();
  let nativeFeesPaid = BigNumber(0);
  let _feeamount;
  const ethBridgeDelegatorActive = !(!!(output.bridgeprelaunch));
  delete output.bridgeprelaunch

  try {
    validateCurrencyTransferOutputParams(output)

    const saveFriendlyName = async (iaddrOrName) => {
      if (!iaddrOrName) return;
      
      const currRes = await getCurrency(systemId, iaddrOrName);

      if (currRes.error) throw new Error("Couldn't get currency " + iaddrOrName);
      else {
        friendlyNames.set(currRes.result.currencyid, currRes.result.fullyqualifiedname);
        currencyDefs.set(currRes.result.currencyid, currRes.result);
        return currRes.result.currencyid;
      }
    }

    const saveVerusIdName = async (iaddrOrName) => {
      if (!iaddrOrName) return;
      
      const idRes = await getIdentity(systemId, iaddrOrName);

      if (idRes.error) throw new Error("Couldn't get identity " + iaddrOrName);
      else {
        friendlyNames.set(
          idRes.result.identity.identityaddress,
          idRes.result.fullyqualifiedname.replace('@', ''),
        );
        return idRes.result.identity.identityaddress;
      }
    }

    output.exportto = await saveFriendlyName(output.exportto);
    output.convertto = await saveFriendlyName(output.convertto);
    output.currency = await saveFriendlyName(output.currency);
    output.feecurrency = await saveFriendlyName(output.feecurrency);
    output.via = await saveFriendlyName(output.via);

    if (!friendlyNames.has(coinObj.system_id)) {
      await saveFriendlyName(coinObj.system_id)
    }

    if (!friendlyNames.has(systemId)) {
      await saveFriendlyName(systemId)
    }

    const {
      currency,
      convertto,
      exportto,
      feecurrency,
      via,
      feesatoshis,
      preconvert,
      address
    } = output;

    if (address.isIAddr()) {
      try {
        await saveVerusIdName(address.getAddressString());
      } catch(e) {}
    }

    const isConversionOrExport = exportto != null || convertto != null;
    const isNativeSend = currency === systemId;
    const isBasicNativeSend = !isConversionOrExport && currency === systemId;
    const _feecurrency = feecurrency == null && isConversionOrExport ? systemId : feecurrency;
    const parentTransactionFee = isConversionOrExport || isBasicNativeSend ? 0.0001 : 0.0002;

    const useSendCurrencyOutput =
      isConversionOrExport &&
      (exportto === coinsList.VRSC.system_id ||
        exportto === coinsList.VRSCTEST.system_id || 
        exportto === "i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X" || // vETH i-addr on VRSC
        exportto === "iCtawpxUiCc2sEupt7Z4u8SDAncGZpgSKm");  // vETH i-addr on VRSCTEST

    _feeamount = feesatoshis;
    nativeFeesPaid = coinsToSats(BigNumber(parentTransactionFee));
    let importToSource = false;
    
    const sourceDefinition = currencyDefs.get(currency);

    if ((sourceDefinition.options & IS_FRACTIONAL_FLAG) == IS_FRACTIONAL_FLAG) {
      importToSource = convertto != null && via == null && sourceDefinition.currencies.includes(convertto);
    }

    if (_feeamount == null && isConversionOrExport) {
      _feeamount = await calculateCurrencyTransferFee(
        systemId,
        currency,
        exportto,
        convertto,
        _feecurrency,
        via,
        source,
        address.getAddressString(),
        preconvert
      );
    }

    if (_feeamount != null && (feecurrency == null || feecurrency === systemId)) {
      nativeFeesPaid = nativeFeesPaid.plus(BigNumber(_feeamount));
    }

    const balanceRes = await getAddressBalances(systemId, [source]);
    if (balanceRes.error) throw new Error(balanceRes.error.message);

    const balanceBn = balanceRes.result.currencybalance[systemId]
      ? coinsToSats(BigNumber(balanceRes.result.currencybalance[systemId]))
      : BigNumber(0);
    const txSatsBn = BigNumber(output.satoshis);

    if (isNativeSend && (txSatsBn.plus(nativeFeesPaid)).isGreaterThan(balanceBn)) {
      output.satoshis = txSatsBn.minus(nativeFeesPaid).toString();
      const newTxSatsBn = BigNumber(output.satoshis);

      if (
        newTxSatsBn.plus(nativeFeesPaid).isGreaterThan(balanceBn) ||
        newTxSatsBn.isLessThanOrEqualTo(BigNumber(0))
      ) {
        throw new Error('Insufficient funds.');
      }
    }

    const infoRes = await getInfo(systemId);

    if (infoRes.error) throw new Error(infoRes.error.message)

    let bridgeid;

    if (currencyDefs.has(exportto)) {
      const exportDefinition = currencyDefs.get(exportto);

      if (exportDefinition.gatewayconverterid) {
        bridgeid = currencyDefs.get(exportto).gatewayconverterid;
      }
    }

    let unfundedTxHex;

    if (
      useSendCurrencyOutput
    ) {
      const addrDest = address.getAddressString();

      const sendCurrencyRes = await getSendCurrencyTransaction(
        systemId,
        currency,
        satsToCoins(BigNumber(output.satoshis)).toNumber(),
        addrDest,
        exportto,
        convertto,
        _feecurrency,
        via,
        source
      );

      if (sendCurrencyRes.error) throw new Error(sendCurrencyRes.error.message);

      const sendCurrencyHex = sendCurrencyRes.result.hextx;
      
      const unfundedTxObj = Transaction.fromHex(sendCurrencyHex, networks.verus);
      const outputInfo = unpackOutput(unfundedTxObj.outs[0], systemId);

      /**
       * @type {ReserveTransfer}
       */
      const transDest = outputInfo.params[0].data;

      if (ethBridgeDelegatorActive || (exportto !== "i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X" && exportto !== "iCtawpxUiCc2sEupt7Z4u8SDAncGZpgSKm")) {
        if (!transDest.transfer_destination.isGateway()) throw new Error("Expected gateway output");
        if (transDest.transfer_destination.gateway_id !== exportto) throw new Error("Expected gateway_id to match exportto");
        if (transDest.transfer_destination.gateway_code !== "i3UXS5QPRQGNRDDqVnyWTnmFCTHDbzmsYk") throw new Error("Expected null gateway_code");
        if (!transDest.transfer_destination.hasAuxDests()) throw new Error("Expected output with aux dests");

        if (transDest.transfer_destination.aux_dests.length > 0) {
          const selfSystemRes = await getCurrency(systemId, systemId);
          if (selfSystemRes.error) throw new Error("Couldn't get own system information")

          const permittedAuxDests = selfSystemRes.result.notaries != null && exportto != null ? selfSystemRes.result.notaries : []

          for (const aux_dest of transDest.transfer_destination.aux_dests) {
            if (aux_dest.hasAuxDests()) {
              throw new Error("Nested aux destinations not supported");
            }
    
            if (aux_dest.isGateway()) throw new Error("Expected non gateway output in aux dest");
    
            const addrString = aux_dest.getAddressString();
            if (
              addrString !== addrDest &&
              addrString !== source &&
              !(permittedAuxDests.includes(addrString) && aux_dest.isIAddr())
            )
              throw new Error(
                `Aux dest ${addrString} does not match source or destination`,
              );
          }
        }
      }
      
      if (transDest.transfer_destination.getAddressString() !== addrDest) throw new Error("Expected output to match destination address");

      unfundedTxHex = sendCurrencyRes.result.hextx;
    } else {
      unfundedTxHex = createUnfundedCurrencyTransfer(
        systemId,
        [
          {
            ...output,
            feesatoshis: _feeamount,
            feecurrency: _feecurrency,
            importtosource: importToSource,
            bridgeid,
          },
        ],
        networks.verus,
        Number(
          BigNumber(infoRes.result.longestchain).plus(BigNumber(100)).toString(),
        ),
        4,
        0x892f2085,
      );
    }

    const utxoList = await getSpendableUtxos(systemId, currency, [source]);

    const fundRes = await fundRawTransaction(
      systemId,
      unfundedTxHex,
      utxoList.map(utxo => {
        return {
          voutnum: utxo.outputIndex,
          txid: utxo.txid,
        };
      }),
      source,
      parentTransactionFee,
    );

    if (fundRes.error) throw new Error(fundRes.error.message);

    const validation = validateFundedCurrencyTransfer(
      systemId,
      fundRes.result.hex,
      unfundedTxHex,
      source,
      networks.verus,
      utxoList,
    );

    const deltas = new Map();

    if (!validation.valid) throw new Error(validation.message);
    else {
      for (const key in validation.sent) {
        if (deltas.has(key)) deltas.set(key, deltas.get(key).minus(BigNumber(validation.sent[key])))
        else deltas.set(key, BigNumber(validation.sent[key]).multipliedBy(BigNumber(-1)))
      }

      for (const key in validation.fees) {
        if (deltas.has(key)) deltas.set(key, deltas.get(key).minus(BigNumber(validation.fees[key])))
        else deltas.set(key, BigNumber(validation.fees[key]).multipliedBy(BigNumber(-1)))
      }
    };

    deltas.forEach((value, key) => {
      if (key !== currency && key !== feecurrency && value.isGreaterThan(0)) {
        throw new Error("Can only spend either fee currency or sent currency.")
      } 
    })

    Object.keys(validation.fees).forEach((key) => {
      const value = BigNumber(validation.fees[key]);

      if (((feecurrency != null && key !== feecurrency) || (feecurrency == null && key !== systemId)) && value.isGreaterThan(0)) {
        throw new Error("Can only spend fee in fee currency (if specified) or system currency.")
      }
    })

    const preflightTx = Transaction.fromHex(fundRes.result.hex, networks.verus);

    const inputs = []

    preflightTx.ins.forEach((input) => {
      const inHash = input.hash.reverse().toString('hex')
      const prevoutIndex = utxoList.findIndex(
        x =>
          x.txid === inHash &&
          x.outputIndex === input.index,
      );

      if (prevoutIndex < 0) throw new Error("Cannot find input " + inHash)
      else {
        inputs.push(utxoList[prevoutIndex])
      }
    })

    let conversionEstimate;

    if (convertto) {
      const estimateRes = await estimateConversion(
        systemId,
        currency,
        convertto,
        satsToCoins(BigNumber(output.satoshis)).toNumber(),
        via,
        preconvert,
      );

      if (
        estimateRes.error == null &&
        estimateRes.result.outputcurrencyid === convertto
      ) {
        conversionEstimate = estimateRes.result;
      }
    }

    return {
      err: false,
      result: {
        output,
        validation,
        hex: fundRes.result.hex,
        names: friendlyNames,
        deltas,
        source,
        inputs,
        converterdef: output.convertto ? currencyDefs.get(output.convertto) : output.convertto,
        submittedsats: submittedAmount,
        estimate: conversionEstimate
      },
    }
  } catch (e) {
    console.error(e)

    let message = e.message;

    if (message != null && typeof message === 'string' && message.includes('Insufficient funds')) {
      const systemName = friendlyNames.has(systemId)
        ? friendlyNames.get(systemId)
        : systemId
      const feeCurrencyName = output.feecurrency
        ? friendlyNames.has(output.feecurrency)
          ? friendlyNames.get(output.feecurrency)
          : output.feecurrency
        : systemName;
      const nativeFeeAmount = satsToCoins(nativeFeesPaid).toString();

      message = `Insufficient funds. Ensure you have at least ${
        output.feecurrency === systemId
          ? nativeFeeAmount
            : satsToCoins(BigNumber(_feeamount)).toString()
            } ${feeCurrencyName} on the ${systemName} network to fund the fee for transaction.`;
    }

    return {
      err: true,
      result: message
    };
  }
}