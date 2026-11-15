import BigNumber from 'bignumber.js';

const MAX_ATOMIC = new BigNumber('9223372036854775807');

export const requireAtomicAmount = amount => {
  if (typeof amount !== 'string' || !/^(0|[1-9][0-9]*)$/.test(amount) || new BigNumber(amount).gt(MAX_ATOMIC)) {
    throw new Error('Registration amounts must be nonnegative atomic integer strings.');
  }
  return amount;
};

export const formatRegistrationAmount = amount => {
  requireAtomicAmount(amount);
  const padded = amount.padStart(9, '0');
  const fraction = padded.slice(-8).replace(/0+$/, '');
  return `${padded.slice(0, -8)}${fraction ? `.${fraction}` : ''}`;
};

export const validateRegistrationQuote = quote => {
  if (!quote || !quote.systemID || !quote.issuerID) throw new Error('Missing registration cost quote.');
  ['commitmentFee', 'registrationOffer', 'nativeFee', 'importFee', 'transferFee'].forEach(key => requireAtomicAmount(quote[key]));
  [quote.totalRequired, quote.totalOperationRequired].forEach(amounts => {
    if (!amounts || typeof amounts !== 'object' || Array.isArray(amounts)) throw new Error('Invalid registration totals.');
    Object.values(amounts).forEach(requireAtomicAmount);
  });
  const ids = new Set([...Object.keys(quote.totalRequired), ...Object.keys(quote.totalOperationRequired)]);
  ids.forEach(id => {
    const expected = new BigNumber(quote.totalRequired[id] || '0').plus(id === quote.systemID ? quote.commitmentFee : '0');
    if (!expected.eq(quote.totalOperationRequired[id] || '0')) throw new Error('Inconsistent two-stage registration costs.');
  });
  return quote;
};

// Candidate height changes routinely. All monetary amounts, recipients, and
// currencies must still match the review before a refreshed plan is signed.
export const registrationQuotesEqual = (left, right) => {
  validateRegistrationQuote(left);
  validateRegistrationQuote(right);
  const stable = value => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => {
      if (key !== 'candidateHeight' && value[key] !== undefined) out[key] = stable(value[key]);
      return out;
    }, {});
    return value;
  };
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
};
