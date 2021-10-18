/**
 * Translates a Wyre rates result object in { curr1curr2: { curr1: price, curr2: price }}
 * format into { curr1: { curr2: price, curr3: price, ... }, curr2: { curr1: price, curr3: price, ... }  }
 * @param {*} wyreRates Rates returned by Wyre
 * @param {*} searchCurrencies Currencies to be returned as keys in the result
 */
export const extractWyreRates = (wyreRates, searchCurrencies) => {
  const pairs = Object.keys(wyreRates)
  let results = {}

  for (const currency of searchCurrencies) {
    results[currency] = {}
  
    for (const pair of pairs) {
      const currencyMatch = pair.substring(0, currency.length)

      if (currencyMatch === currency) {
        const match = pair.substring(currency.length, pair.length)
  
        if (match != null && wyreRates[pair][match] != null) {
          results[currency][match] = wyreRates[pair][match]
        }
      }
    }
  }

  return results
}