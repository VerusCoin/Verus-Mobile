import BigNumber from "bignumber.js";
import { getAddressBalances } from "./getAddressBalances";
import { satsToCoins } from "../../../../math";
import { TransferDestination } from "verus-typescript-primitives";
import { Transaction, networks, smarttxs } from "@bitgo/utxo-lib";
import { calculateCurrencyTransferFee } from "./calculateCurrencyTransferFee";
import { getInfo } from "./getInfo";
import { fundRawTransaction } from "./fundRawTransaction";
import { getAddressUtxos } from "./getAddressUtxos";
import { getCurrency } from "../../verusid/callCreators";
const { createUnfundedCurrencyTransfer, validateFundedCurrencyTransfer } = smarttxs

//TODO: Calculate fee for each coin seperately
export const preflight = async (coinObj, activeUser, address, amount, params, channelId) => {
  const defaultFee = BigNumber(0.0001)
  let spendableBalance = BigNumber(0)
  let feeTakenFromAmount = false
  let amountToSend = BigNumber(amount)
  let source;
  
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

  const transparentAddressTest = new RegExp('^[a-zA-Z0-9]{20,50}$')

  if (!transparentAddressTest.test(address)) {
    return {
      err: true,
      result: `"${address}" is not a valid destination.`
    }
  }

  try {
    const balance = await getAddressBalances(coinObj.system_id, [source]);

    if (balance.error) {
      return {
        err: true,
        result: 'Cannot fetch balance.',
      };
    } else {
      spendableBalance = satsToCoins(BigNumber(balance.result.balance));
    }
  } catch (e) {
    return {
      err: true,
      result: 'Cannot fetch balance.',
    };
  }

  const deductedAmount = amountToSend.plus(defaultFee)

  if (deductedAmount.isEqualTo(spendableBalance.plus(defaultFee))) {
    amountToSend = amountToSend.minus(defaultFee)
    feeTakenFromAmount = true
  } else if (deductedAmount.isGreaterThan(spendableBalance)) {
    return {
      err: true,
      result: `Insufficient confirmed funds.`
    }
  }

  return {
    err: false,
    result: {
      fee: defaultFee.toString(),
      value: amountToSend.toString(),
      toAddress: address,
      fromAddress: source,
      amountSubmitted: amount.toString(),
      params: {
        feeTakenFromAmount,
      },
    },
  }
}

export const validateSendOrCrossChainOutputParams = obj => {
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


export const preflightConvertOrCrossChain = async (coinObj, channelId, activeUser, output) => {
  let source;
  
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

  try {
    validateSendOrCrossChainOutputParams(output)
    const {
      currency,
      convertto,
      exportto,
      feecurrency,
      via,
      feesatoshis
    } = output;

    const friendlyNames = new Map();
    const currencyDefs = new Map();

    const saveFriendlyName = async (iaddrOrName) => {
      if (!iaddrOrName) return;
      
      const currRes = await getCurrency(coinObj, iaddrOrName);

      if (currRes.error) throw new Error("Couldn't get identity " + iaddrOrName);
      else {
        friendlyNames.set(currRes.result.currencyid, currRes.result.fullyqualifiedname);
        currencyDefs.set(currRes.result.currencyid, currRes.result);
        return currRes.result.currencyid;
      }
    }

    output.exportto = await saveFriendlyName(exportto);
    output.convertto = await saveFriendlyName(convertto);
    output.currency = await saveFriendlyName(currency);
    output.feecurrency = await saveFriendlyName(feecurrency);
    output.via = await saveFriendlyName(via);

    const isConversionOrExport = exportto != null || convertto != null
    const { system_id } = coinObj
    const _feecurrency = feecurrency == null && isConversionOrExport ? system_id : feecurrency;
    let _feeamount = feesatoshis;

    if (feecurrency != null && _feeamount == null)
      throw new Error(
        'Providing a non-default fee currency requires also providing a fee amount.',
      );

    if (_feeamount == null && isConversionOrExport) {
      _feeamount = await calculateCurrencyTransferFee(coinObj, currency, exportto, convertto, _feecurrency, via)
    }

    const infoRes = await getInfo(coinObj.system_id);

    if (infoRes.error) throw new Error(infoRes.error.message)

    const unfundedTxHex = createUnfundedCurrencyTransfer(
      system_id,
      [
        {
          ...output,
          feesatoshis: _feeamount,
          feecurrency: _feecurrency,
        },
      ],
      networks.verus,
      Number(
        BigNumber(infoRes.result.longestchain).plus(BigNumber(100)).toString(),
      ),
      4,
      0x892f2085,
    );

    const utxosRes = await getAddressUtxos(coinObj.system_id, [source]);

    if (utxosRes.error) throw new Error(utxosRes.error.message);

    const fundRes = await fundRawTransaction(
      coinObj.system_id,
      unfundedTxHex,
      utxosRes.result.filter(x => x.isspendable).map(utxo => {
        return {
          voutnum: utxo.outputIndex,
          txid: utxo.txid,
        };
      }),
      source,
      0.0001,
    );

    if (fundRes.error) throw new Error(fundRes.error.message);

    const validation = validateFundedCurrencyTransfer(
      coinObj.system_id,
      fundRes.result.hex,
      unfundedTxHex,
      source,
      networks.verus,
      utxosRes.result,
    );

    const deltas = new Map()

    if (!validation.valid) throw new Error("Failed to validate funded transaction.");
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

    const preflightTx = Transaction.fromHex(fundRes.result.hex, networks.verus);

    const inputs = []

    preflightTx.ins.forEach((input) => {
      const inHash = input.hash.reverse().toString('hex')
      const prevoutIndex = utxosRes.result.findIndex(
        x =>
          x.txid === inHash &&
          x.outputIndex === input.index,
      );

      if (prevoutIndex < 0) throw new Error("Cannot find input " + inHash)
      else {
        inputs.push(utxosRes.result[prevoutIndex])
      }
    })

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
        converterdef: output.convertto ? currencyDefs.get(output.convertto) : output.convertto
      },
    }
  } catch (e) {
    console.error(e)

    return {
      err: true,
      result: e.message
    };
  }
}