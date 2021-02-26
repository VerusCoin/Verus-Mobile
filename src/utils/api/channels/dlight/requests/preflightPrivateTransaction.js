import { getPrivateBalance } from "./getPrivateBalance"
import BigNumber from "bignumber.js";

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

  console.log({
    err: false,
    result: {
      fee: defaultFee.toString(),
      value: amountToSend.toString(),
      toAddress: address,
      fromAddress: params.fromAddress,
      amountSubmitted: amount.toString(),
      memo: params.memo,
      params: {
        feeTakenFromAmount,
      },
    },
  })

  return {
    err: false,
    result: {
      fee: defaultFee.toString(),
      value: amountToSend.toString(),
      toAddress: address,
      fromAddress: params.fromAddress,
      amountSubmitted: amount.toString(),
      memo: params.memo,
      params: {
        feeTakenFromAmount,
      },
    },
  }
}

