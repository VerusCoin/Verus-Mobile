import {Alert} from 'react-native';
import BigNumber from 'bignumber.js';
import {verifyPendingIdentityFunding} from './durableBroadcast';

// Display only fees already verified against the transaction being claimed.
export const verifiedClaimFees = transactions => {
  const totals = new Map();

  for (const transaction of transactions) {
    let fees;
    if (transaction.type === 'identity') {
      verifyPendingIdentityFunding(transaction);
      // nativeFee already includes explicit transfer fees; never add them twice.
      fees = {
        ...transaction.fundingApproval.fees,
        [transaction.systemId]: transaction.fundingApproval.nativeFee,
      };
    } else {
      if (transaction.validation?.valid !== true) {
        throw new Error('The claim fee has not been verified.');
      }
      fees = transaction.validation.fees;
    }

    if (!fees || Object.keys(fees).length === 0) {
      throw new Error('The claim fee has not been verified.');
    }

    for (const [currency, value] of Object.entries(fees)) {
      const amount = new BigNumber(value);
      if (!amount.isFinite() || !amount.isInteger() || amount.isNegative()) {
        throw new Error('The claim contains an invalid verified fee.');
      }
      totals.set(
        currency,
        (totals.get(currency) || new BigNumber(0)).plus(amount),
      );
    }
  }

  return [...totals]
    .filter(([, amount]) => amount.gt(0))
    .map(([currency, amount]) => ({
      currency,
      atomic: amount.toFixed(0),
      coins: amount.dividedBy('100000000').toFixed(),
    }));
};

export const confirmVerifiedClaimFees = (
  preflightPlan,
  currencyName = currency => currency,
) => {
  const fees = verifiedClaimFees(preflightPlan.transactions);
  const description =
    fees.map(fee => `${fee.coins} ${currencyName(fee.currency)}`).join('\n') ||
    '0';

  return new Promise(resolve =>
    Alert.alert(
      'Confirm claim fees',
      `Network fees will be deducted from the claim:\n\n${description}\n\nContinue with this claim?`,
      [
        {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
        {text: 'Claim', onPress: () => resolve(true)},
      ],
      {cancelable: true, onDismiss: () => resolve(false)},
    ),
  );
};
