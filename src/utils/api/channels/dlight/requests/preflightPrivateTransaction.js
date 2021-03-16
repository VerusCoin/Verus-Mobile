import { getPrivateBalance } from "./getPrivateBalance"
import BigNumber from "bignumber.js";
import { DLIGHT_PRIVATE } from "../../../../constants/intervalConstants";

//TODO: Calculate fee for each coin seperately
export const preflightPrivateTransaction = async (coinObj, activeUser, address, amount, params) => {
  const defaultFee = BigNumber(0.0001)
  let spendableBalance = BigNumber(0)
  let feeTakenFromAmount = false
  let amountToSend = BigNumber(amount)
  let pendingBalance = BigNumber(0)
  const coinId = coinObj.id
  const accountHash = activeUser.accountHash
  const coinProto = coinObj.proto

  const transparentAddressTest = new RegExp('^[a-zA-Z0-9]{20,50}$')
  const privateAddressTest = new RegExp('^zs[a-zA-Z0-9]{65,85}$')

  if (!transparentAddressTest.test(address) && !privateAddressTest.test(address)) {
    return {
      err: true,
      result: `"${address}" is not a valid destination.`
    }
  }

  try {
    const privBalance = await getPrivateBalance(coinId, accountHash, coinProto)

    spendableBalance = privBalance.result.confirmed
    pendingBalance = privBalance.result.total.minus(privBalance.result.confirmed)
  } catch(e) {
    return {
      err: true,
      result: "Cannot fetch balance."
    }
  }

  const deductedAmount = amountToSend.plus(defaultFee)

  if (deductedAmount.isEqualTo(spendableBalance.plus(defaultFee))) {
    amountToSend = amountToSend.minus(defaultFee)
    feeTakenFromAmount = true
  } else if (deductedAmount.isGreaterThan(spendableBalance)) {
    if (pendingBalance.isGreaterThan(0)) {
      return {
        err: true,
        result: `Insufficient confirmed funds. You have a pending balance of ${pendingBalance.toString()} ${coinId}.`
      }
    } else {
      return {
        err: true,
        result: `Insufficient confirmed funds.`
      }
    }
  }

  return {
    err: false,
    result: {
      fee: defaultFee.toString(),
      value: amountToSend.toString(),
      toAddress: address,
      fromAddress: activeUser.keys[coinObj.id][DLIGHT_PRIVATE].addresses[0],
      amountSubmitted: amount.toString(),
      memo: params.memo,
      params: {
        feeTakenFromAmount,
      },
    },
  }
}

