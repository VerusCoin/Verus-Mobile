import { ethers } from "ethers"
import { ETHERS } from "./constants/web3Constants"
import BigNumber from "bignumber.js";

//Math done to eliminate JS rounding errors when moving from statoshis to coin denominations
export const coinsToSats = (coins) => {
  return coins.multipliedBy(BigNumber(100000000))
}

export const satsToCoins = (satoshis) => {
  return satoshis.dividedBy(BigNumber(100000000))
}

export const truncateDecimal = (value, numDecimals) => {
  if (typeof value === 'string' || isNumber(value)) value = BigNumber(value)

  let n = value.toFormat(numDecimals).replace(/\.0+$/,'')

  if (n.match(/\./)) {
    n = n.replace(/\.?0+$/, '');
  }

  return n
}

export const bigNumberifyBalance = (balanceObj) => {
  const { confirmed, pending, total } = balanceObj

  return {
    confirmed: confirmed != null ? BigNumber(confirmed) : confirmed,
    pending: pending != null ? BigNumber(pending) : pending,
    total: total != null ? BigNumber(total) : total
  }
}

export const findNumDecimals = (value) => {
  if (Math.floor(value) !== value) {
    return value.toString().split(".")[1].length || 0;
  } else {
    return 0;
  }
}

export const unixToDate = (unixTime) => {
  return (new Date(unixTime*1000)).toUTCString();
}

export const kmdCalcInterest = (locktime, value) => {
  if (satsToCoins(Number(value)) < 10 || locktime <= 0) return 0

  const timestampDiff = Math.floor(Date.now() / 1000) - locktime - 777;
  let timestampDiffMinutes = timestampDiff / 60;
  let interest = 0;

  // calc interest
  if (timestampDiffMinutes >= 60) {
    //if (timestampDiffMinutes > 365 * 24 * 60) {
    //  timestampDiffMinutes = 365 * 24 * 60;
    //}
    if (timestampDiffMinutes > 31 * 24 * 59) {
      timestampDiffMinutes = 31 * 24 * 59;
    }
    timestampDiffMinutes -= 59;

    interest = (satsToCoins(Number(value)) / 10512000) * timestampDiffMinutes;
  }

  return interest;
}

export const maxSpendBalance = (utxoList, fee) => {
  let _maxSpendBalance = BigNumber(0);

  for (let i = 0; i < utxoList.length; i++) {
    _maxSpendBalance = _maxSpendBalance.plus(BigNumber(utxoList[i].value));
  }

  if (fee) {
    return _maxSpendBalance.minus(BigNumber(fee));
  } else {
    return _maxSpendBalance;
  }
}

export const isNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

export class MathableNumber {
  constructor(num, maxDecimals = ETHERS, bigNum = null) {
    this.num = bigNum == null ? ethers.utils.parseUnits(num.toString(), maxDecimals) : bigNum
    this.maxDecimals = maxDecimals
  }

  display() {
    return ethers.utils.formatUnits(this.num, this.maxDecimals)
  }
} 