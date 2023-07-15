import {
  satsToCoins,
  coinsToSats,
  truncateDecimal,
  findNumDecimals,
  unixToDate,
  kmdCalcInterest,
  maxSpendBalance,
  isNumber
} from '../../math'

import {
  MOCK_SATS,
  MOCK_COINS,
  MOCK_COINS_TRUNC,
  NUM_DECIMALS_MOCK_COINS,
  MOCK_LOCKTIME,
  MOCK_UTXO_LIST,
  MOCK_FEE,
  MOCK_MAX_SPEND
} from '../../../tests/helpers/MockNumbers'
import BigNumber from 'bignumber.js'

describe("Number processing operations", () => {
  it('can convert a satoshi value to a coins value', () => {
    expect(satsToCoins(BigNumber(MOCK_SATS)).toString()).toBe(MOCK_COINS)
  })

  it('can convert a coins value to a satoshi value', () => {
    expect(coinsToSats(BigNumber(MOCK_COINS)).toString()).toBe(MOCK_SATS)
  })

  it('can truncate a decimal without rounding', () => {
    expect(Number(truncateDecimal(MOCK_COINS, 4))).toBe(MOCK_COINS_TRUNC)
  })

  it('can find the number of decimals in a floating point number', () => {
    expect(findNumDecimals(MOCK_COINS)).toBe(NUM_DECIMALS_MOCK_COINS)
  })

  it('can convert a unix value to a date string', () => {
    expect(unixToDate(0)).toBe("1/1/1970, 1:00:00 AM")
  })

  it('can calculate KMD interest from locktime and utxo value', () => {
    expect(kmdCalcInterest(MOCK_LOCKTIME, MOCK_COINS, 3484959)).toBe(0)
  })

  it('can calculate max spend balance', () => {
    expect(maxSpendBalance(MOCK_UTXO_LIST, MOCK_FEE).toString()).toBe(MOCK_MAX_SPEND)
  })

  it('can identify number', () => {
    let notNumber = 'This is not a number'
    let number = '5'
    let float = 4.342342

    expect(isNumber(notNumber)).toBe(false)
    expect(isNumber(number)).toBe(true)
    expect(isNumber(float)).toBe(true)
  })
})