import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {STATUS_BADGE_TONE} from '../../../components/StatusBadge';
import {truncateDecimal} from '../../../utils/math';
import {
  formatImpact,
  getExtraCost,
  getImpactLevel,
  getImpactLoss,
  getPriceImpact,
  getTargetShortfall,
  getUnitPrice,
  IMPACT_LEVEL,
} from '../priceImpact';

export const getImpactTone = level =>
  level === IMPACT_LEVEL.DANGER
    ? STATUS_BADGE_TONE.DANGER
    : level === IMPACT_LEVEL.WARNING
    ? STATUS_BADGE_TONE.WARNING
    : STATUS_BADGE_TONE.NEUTRAL;

// One label for send and invoice mode. At or better than market has no impact.
export const getImpactBadgeLabel = impact =>
  impact.isLessThanOrEqualTo(0)
    ? 'None'
    : `${formatImpact(impact)}%`;

// What the impact costs the user. The display currency comes first when the
// ledger holds a price for the asset the user pays with. Otherwise the amount
// is counted in the asset the user receives, so it reads next to the receive
// row. Returns null when nothing can be said.
export const getImpactLossText = ({
  displayCurrency,
  loss,
  rate,
  targetLoss,
  targetTicker,
}) => {
  if (rate != null && loss) {
    const fiat = loss.multipliedBy(rate).decimalPlaces(2);
    if (fiat.isGreaterThan(0)) {
      return formatCurrency({amount: fiat.toFixed(2), code: displayCurrency})[0];
    }
  }

  if (targetLoss && targetLoss.isGreaterThan(0)) {
    // A small loss can be below one received-asset unit's precision. Keep
    // three significant digits and use fixed notation so it never reads zero.
    const amount = targetLoss.isLessThan(1)
      ? targetLoss.precision(3, BigNumber.ROUND_DOWN).toFixed()
      : truncateDecimal(targetLoss, targetLoss.isGreaterThanOrEqualTo(100) ? 2 : 4);
    return `${amount} ${targetTicker}`;
  }

  return null;
};

// Output per input unit for display: four decimals once it reaches one, more
// below that so a small price does not read as zero.
// The wizard keeps the market price as text, so accept either form.
export const formatUnitPrice = price => {
  const value = BigNumber(price);
  return truncateDecimal(value, value.isGreaterThanOrEqualTo(1) ? 4 : 8);
};

// Everything the Confirm review shows about a conversion's price, derived from
// the latest estimate and the market price the Amount (or Pay with) step
// measured. All fields are null when the market price is unknown. With `pay`,
// the amount received is fixed, so the impact is how much more the user pays,
// counted in the money or the asset the user pays with.
export const getConversionPriceSummary = ({
  amount,
  displayCurrency,
  marketPrice,
  output,
  pay = false,
  rate,
  sourceTicker,
  targetTicker,
}) => {
  const unitPrice = getUnitPrice(amount, output);

  if (pay) {
    const cost = getExtraCost({amount, output, marketPrice});
    return {
      impact: cost ? cost.percent : null,
      level: getImpactLevel(cost ? cost.percent : null),
      loss: cost ? cost.extra : null,
      lossText: cost
        ? getImpactLossText({
            displayCurrency,
            loss: cost.extra,
            rate,
            targetLoss: cost.extra,
            targetTicker: sourceTicker,
          })
        : null,
      unitPrice,
    };
  }

  const impact = getPriceImpact({amount, output, marketPrice});
  const loss = impact ? getImpactLoss(amount, impact) : null;

  return {
    impact,
    level: getImpactLevel(impact),
    loss,
    lossText: impact
      ? getImpactLossText({
          displayCurrency,
          loss,
          rate,
          targetLoss: getTargetShortfall({amount, output, marketPrice}),
          targetTicker,
        })
      : null,
    unitPrice,
  };
};

// An estimated amount for display. Four decimals once it reaches one, eight
// below that: the quote is approximate, so more digits only add noise.
export const formatEstimatedAmount = value => {
  const amount = BigNumber(value);
  const [whole, fraction] = truncateDecimal(
    amount, amount.isGreaterThanOrEqualTo(1) ? 4 : 8,
  ).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
};
