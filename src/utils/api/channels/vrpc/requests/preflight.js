import BigNumber from "bignumber.js";
import { getAddressBalances } from "./getAddressBalances";
import { satsToCoins } from "../../../../math";

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
        coinObj.id +
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
    const balance = await getAddressBalances(coinObj, [source]);

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

