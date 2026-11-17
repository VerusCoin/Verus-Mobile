import {useCallback} from 'react';
import {useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {USD} from '../../utils/constants/currencies';
import {API_GET_FIATPRICE} from '../../utils/constants/intervalConstants';

// Fiat values for the wizard's source Card. A price is only shown when the
// ledger already holds one for that coin; nothing is fetched here.
export const useWizardFiat = sourceSubWallet => {
  const displayCurrency = useSelector(
    stateValue =>
      stateValue.settings.generalWalletSettings.displayCurrency || USD,
  );
  const rates = useObjectSelector(stateValue => stateValue.ledger.rates);
  const fiatChannel = sourceSubWallet?.api_channels?.[API_GET_FIATPRICE];

  const getRate = useCallback(
    coinId =>
      fiatChannel == null || coinId == null
        ? null
        : rates?.[fiatChannel]?.[coinId]?.[displayCurrency] ?? null,
    [displayCurrency, fiatChannel, rates],
  );

  // Formatted amount for a coin, or null when there is no price.
  const format = useCallback(
    (amount, coinId) => {
      const rate = getRate(coinId);
      const value = BigNumber(amount);
      if (rate == null || !value.isFinite()) return null;
      return formatCurrency({
        amount: value.multipliedBy(rate).decimalPlaces(2).toFixed(2),
        code: displayCurrency,
      })[0];
    },
    [displayCurrency, getRate],
  );

  return {displayCurrency, format, getRate};
};

export default useWizardFiat;
