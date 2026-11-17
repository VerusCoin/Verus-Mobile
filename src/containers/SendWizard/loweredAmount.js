import BigNumber from 'bignumber.js';
import {satsToCoins, truncateDecimal} from '../../utils/math';

// The amount the user entered, when the prepared transaction sends less of it
// because the wallet took the fees from the amount. Otherwise null. A
// preflight that lowered the amount keeps the entered value in `submittedsats`
// (Verus, Ethereum bridge) or `amountSubmitted` (simple sends); without either,
// the entered value is the wizard's own amount.
export const getLoweredFrom = (result, amount, sentAmount) => {
  if (!result) return null;
  const entered = result.submittedsats != null
    ? satsToCoins(BigNumber(result.submittedsats))
    : BigNumber(result.amountSubmitted ?? amount ?? 0);

  return entered.isFinite() && entered.isGreaterThan(sentAmount) ? entered : null;
};

// The props that show a lowered amount on the pay node: the entered amount
// struck through, and the reason under the label.
export const loweredNodeProps = (enteredAmount, ticker) => enteredAmount
  ? {
      enteredAmount: `${truncateDecimal(enteredAmount, 8)} ${ticker || ''}`.trim(),
      note: 'Lowered for fees',
    }
  : {};
