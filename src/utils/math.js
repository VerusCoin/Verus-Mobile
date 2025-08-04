import { ethers } from "ethers"
import { ETHERS } from "./constants/web3Constants"
import BigNumber from "bignumber.js";
import { translate } from "./translate";
import { KOMODO_DIVISOR, KOMODO_ENDOFERA, KOMODO_LOCKTIME_THRESHOLD, KOMODO_MIN_SATOSHIS, KOMODO_N_S7_HARDFORK_HEIGHT, KOMODO_ONE_MONTH_CAP_HARDFORK, ONE_HOUR, ONE_MONTH, ONE_YEAR } from "./constants/constants";

//Math done to eliminate JS rounding errors when moving from statoshis to coin denominations
export const coinsToUnits = (coin, decimals) => {
  return coin.multipliedBy(BigNumber(10).pow(BigNumber(decimals)))
}

export const unitsToCoins = (units, decimals) => {
  return units.dividedBy(BigNumber(10).pow(BigNumber(decimals)))
}

export const coinsToSats = (coins) => {
  return BigNumber(coinsToUnits(coins, 8).toFixed(0))
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

/**
 * Returns a string to display the time in years, months, days, hours, and minutes for a given
 * number of blocks and blocktime.
 * @param {number} blocks Number of blocks
 * @param {number} blocktime Blocktime in seconds
 * @returns {string} A human-readable string representing the time duration (e.g., "2 YEARS 3 MONTHS 5 DAYS 4 HOURS 20 MINUTES").
 */
export const blocksToTime = (blocks, blocktime = 60) => {
  const years = (((blocks/(60/blocktime))/60)/24)/365.25;
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

/*
The following license applies to the kmdCalcInterest function below:

MIT License

Copyright (c) 2018 - 2019 Atomic Labs, Luke Childs
Copyright (c) 2019 - 2022 Komodo Platform

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export const kmdCalcInterest = (locktime, satoshis, height = 0) => {
  const tiptime = Math.floor(Date.now() / 1000) - 777;

	// Calculate coinage
	const coinage = Math.floor((tiptime - locktime) / ONE_HOUR);

	// Return early if UTXO is not eligible for rewards
	if (
		(height >= KOMODO_ENDOFERA) ||
		(locktime < KOMODO_LOCKTIME_THRESHOLD) ||
		(satoshis < KOMODO_MIN_SATOSHIS) ||
		(coinage < ONE_HOUR) ||
		(!height)
	) {
		return 0;
	}

	// Cap reward periods
	const limit = (height >= KOMODO_ONE_MONTH_CAP_HARDFORK) ? ONE_MONTH : ONE_YEAR;
	let rewardPeriod = Math.min(coinage, limit);

	// The first hour of coinage should not accrue rewards
	rewardPeriod -= 59;

	// Calculate rewards
	let rewards = Math.floor(satoshis / KOMODO_DIVISOR) * rewardPeriod;

	// Vote-KIP0001 resulted in a reduction of the AUR from 5% to 0.01%
	// https://github.com/KomodoPlatform/kips/blob/main/kip-0001.mediawiki
	// https://github.com/KomodoPlatform/komodo/pull/584
	if (height >= KOMODO_N_S7_HARDFORK_HEIGHT) {
		rewards = Math.floor(rewards / 500);
	}

	// Ensure reward value is never negative
	if (rewards < 0) {
		throw new Error('Reward should never be negative');
	}

	return satsToCoins(BigNumber(rewards)).toNumber()
}