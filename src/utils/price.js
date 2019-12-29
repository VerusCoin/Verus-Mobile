import { isNumber, truncateDecimal } from './math';

export const calculatePrice = (amount, fromCurr, toCurr, rates) => {
    let conversion = `${fromCurr}${toCurr}`
    const exchangeRate = rates[conversion]
  
    if (amount.toString() && isNumber(amount) && exchangeRate) {
      return truncateDecimal(amount/exchangeRate, 8)
    }
    
    return '-'
  }