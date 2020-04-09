//Math done to eliminate JS rounding errors when moving from statoshis to coin denominations
export const coinsToSats = (coins) => {
  return (Math.round(coins*10000000000))/100
}

export const satsToCoins = (satoshis) => {
  return (Math.round(satoshis))/100000000
}

export const truncateDecimal = (value, numDecimals) => {
  let x = Math.pow(10, numDecimals + 5)
  let y = Math.pow(10, numDecimals)

  let expandedValue = (Math.round(value*x))/100000
  let truncatedValue = Math.trunc(expandedValue)
  let newValue = (Math.round(truncatedValue))/y

  return Number(newValue.toFixed(numDecimals))
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
  let _maxSpendBalance = 0;

  for (let i = 0; i < utxoList.length; i++) {
    _maxSpendBalance += Number(utxoList[i].value);
  }

  if (fee) {
    return Number(_maxSpendBalance) - Number(fee);
  } else {
    return _maxSpendBalance;
  }
}

export const isNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
}