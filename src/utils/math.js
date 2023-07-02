import { ethers } from "ethers"
import { ETHERS } from "./constants/web3Constants"
import BigNumber from "bignumber.js";
import { translate } from "./translate";

//Math done to eliminate JS rounding errors when moving from statoshis to coin denominations
export const coinsToUnits = (coin, decimals) => {
  return coin.multipliedBy(BigNumber(10).pow(BigNumber(decimals)))
}

export const unitsToCoins = (units, decimals) => {
  return units.dividedBy(BigNumber(10).pow(BigNumber(decimals)))
}

export const coinsToSats = (coins) => {
  return coinsToUnits(coins, 8)
}

export const satsToCoins = (satoshis) => {
  return unitsToCoins(satoshis, 8)
}

export const coinsToWei = (coins) => {
  return coinsToUnits(coins, ETHERS)
}

export const weiToCoins = (satoshis) => {
  return unitsToCoins(satoshis, ETHERS)
}

export const toFixedWithoutRounding = (num, decimals) => {
  return num
    .toString()
    .match(new RegExp("^-?\\d+(?:.\\d{0," + (decimals || -1) + "})?"))[0];
}

export const truncateDecimal = (value, numDecimals) => {
  if (typeof value === 'string' || isNumber(value)) value = BigNumber(value)

  let n = toFixedWithoutRounding(value, numDecimals).replace(/\.0+$/,'')

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
  return (new Date(unixTime*1000)).toLocaleString();
}

export const kmdCalcInterest = (locktime, value) => {
  if (satsToCoins(BigNumber(value)).toNumber() < 10 || locktime <= 0) return 0

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

    interest = (satsToCoins(BigNumber(value)).toNumber() / 10512000) * timestampDiffMinutes;
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

export const scientificToDecimal = function(number) {
  let numberHasSign = number.startsWith("-") || number.startsWith("+");
  let sign = numberHasSign ? number[0] : "";
  number = numberHasSign ? number.replace(sign, "") : number;


  if (/\d+\.?\d*e[\+\-]*\d+/i.test(number)) {
    let zero = '0';
    let parts = String(number).toLowerCase().split('e'); 
    let e = parts.pop();
    let l = Math.abs(e);
    let sign = e / l;
    let coeff_array = parts[0].split('.');

    if (sign === -1) {
      coeff_array[0] = Math.abs(coeff_array[0]);
      number = zero + '.' + new Array(l).join(zero) + coeff_array.join('');
    } else {
      let dec = coeff_array[1];
      if (dec) l = l - dec.length;
      number = coeff_array.join('') + new Array(l + 1).join(zero);
    }
  }

  return `${sign}${number}`;
};

export const checkForPlural = (term, time) => {
  if (time > 1 && time < 2){
    return (translate('TX_INFO.' + term));
  }
  else {
    return (translate('TX_INFO.' + term + 'S'));
  }
}

export const blocksToTime = (blocks) => {
  const years = ((blocks/60)/24)/356;
  const months = (years % 1) * 12;
  const days = (months % 1) * 30.4375;
  const hours = (days % 1) * 24;
  const minutes = (hours % 1) * 60;

  if (years < 1){
    if (months < 1){
    if (days < 1){
      if (hours < 1){
      if (minutes < 1){
        return('0 ' + translate('TX_INFO.MINUTES'));
      }
      else {
        return(Math.floor(minutes) + ' ' + checkForPlural('MINUTE', minutes));
      }
      }
      else {
        return(Math.floor(hours) + ' ' + checkForPlural('HOUR', hours) + ' ' + 
        Math.floor(minutes) + ' ' + checkForPlural('MINUTE', minutes));
      }
    }
    else {
      return(
        Math.floor(days) + ' ' + checkForPlural('DAY', days) + ' ' +
        Math.floor(hours) + ' ' + checkForPlural('HOUR', hours) + ' ' + 
        Math.floor(minutes) + ' ' + checkForPlural('MINUTE', minutes));
    }
    }
    else {
      return(
      Math.floor(months) + ' ' + checkForPlural('MONTH', months) + ' ' +
      Math.floor(days) + ' ' + checkForPlural('DAY', days) + ' ' +
      Math.floor(hours) + ' ' + checkForPlural('HOUR', hours) + ' ' + 
      Math.floor(minutes) + ' ' + checkForPlural('MINUTE', minutes));
    }
  }
  else {
    return(
      Math.floor(years) + ' ' + checkForPlural('YEAR', years) + ' ' + 
      Math.floor(months) + ' ' + checkForPlural('MONTH', months) + ' ' +
      Math.floor(days) + ' ' + checkForPlural('DAY', days) + ' ' +
      Math.floor(hours) + ' ' + checkForPlural('HOUR', hours) + ' ' + 
      Math.floor(minutes) + ' ' + checkForPlural('MINUTE', minutes));
  }
};