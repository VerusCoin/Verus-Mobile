/* global __DEV__ */
import {useCallback, useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {useObjectSelector} from '../../../../../hooks/useObjectSelector';
import {USD} from '../../../../../utils/constants/currencies';
import {GENERAL} from '../../../../../utils/constants/intervalConstants';
import {registrationDisplayPrices, registrationFiat} from './namespaceData';

// Read the same display setting and cached ledger rates as useWizardFiat.
// Registration prices remain on-chain USD; formatting never fetches rates.
export const useRegistrationFiat = () => {
  const displayCurrency = useSelector(state => state.settings.generalWalletSettings.displayCurrency || USD);
  const rates = useObjectSelector(state => state.ledger.rates[GENERAL]);
  return useCallback((amounts, prices) => registrationFiat(amounts, prices, displayCurrency, rates), [displayCurrency, rates]);
};

export default function useRegistrationPrices(coin, quote) {
  const testnetPrices = useSelector(state => state.settings?.generalWalletSettings?.testnetPrices === true);
  const [prices, setPrices] = useState({});
  const ids = Object.keys(quote?.totalOperationRequired || {}).sort().join(',');
  const enabled = !!coin && (!coin.testnet || (__DEV__ && testnetPrices));
  useEffect(() => {
    let active = true;
    setPrices({});
    if (enabled) registrationDisplayPrices(coin, ids ? ids.split(',') : []).then(value => { if (active) setPrices(value); });
    return () => { active = false; };
  }, [coin?.id, enabled, ids]);
  return prices;
}
