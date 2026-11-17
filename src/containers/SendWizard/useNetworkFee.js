import {useCallback, useEffect, useMemo, useState} from 'react';
import {ERC20} from '../../utils/constants/intervalConstants';
import {getRecommendedBTCFees} from '../../utils/api/channels/general/callCreators';
import {getWeb3ProviderForNetwork} from '../../utils/web3/provider';
import {getPlainSendFeeOptions} from '../../utils/web3/plainSendFees';
import {FEE_TIERS, maxBTCFeeRate} from './networkFeeUtils';

// Per-confirmation state only. No settings or persistent choice is written.
export default function useNetworkFee({kind, coin, channel, minGasPriceGwei}) {
  const key = `${kind}:${coin?.id}:${coin?.network}:${maxBTCFeeRate(coin)}:${minGasPriceGwei}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [selection, setSelection] = useState(null);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const choice = useMemo(() => selection?.key === key ? selection.choice : {id: 'normal'}, [key, selection]);
  const choose = useCallback(next => setSelection({key, choice: next}), [key]);

  useEffect(() => {
    if (!kind) return undefined;
    let active = true;
    setResult({key, loading: true});
    const load = async () => {
      try {
        let quote;
        if (kind === 'btc') {
          const rates = await getRecommendedBTCFees(Boolean(coin?.testnet), maxBTCFeeRate(coin));
          if (!rates) throw new Error('Fee rates are unavailable. Retry or use a custom fee.');
          quote = {tiers: FEE_TIERS.map(tier => ({feePerByte: rates[tier.btcKey]}))};
        } else {
          quote = await getPlainSendFeeOptions(
            getWeb3ProviderForNetwork(coin?.network).InfuraProvider,
            minGasPriceGwei, channel?.split('.')[0] === ERC20,
          );
        }
        if (active) setResult({key, quote, loading: false});
      } catch (_) {
        if (active) setResult({key, loading: false, error: kind === 'btc'
          ? 'Fee rates are unavailable. Retry or use a custom fee.'
          : 'The network fee is unavailable. Retry to prepare this transaction.'});
      }
    };
    load();
    return () => { active = false; };
  }, [key, attempt, kind, coin?.network, coin?.testnet, coin?.max_fee_rate_per_byte, channel, minGasPriceGwei]);

  const current = result?.key === key ? result : null;
  const quote = current?.quote;
  const fee = useMemo(() => {
    if (choice.id === 'custom' && (kind === 'btc' || quote?.tiers)) return choice.fee;
    if (quote?.automatic) return {...quote.automatic, baseFeePerGas: quote.baseFeePerGas};
    const tier = quote?.tiers?.[FEE_TIERS.findIndex(item => item.id === choice.id)];
    return tier ? {...tier, ...(kind === 'eth' ? {baseFeePerGas: quote.baseFeePerGas} : {})} : null;
  }, [choice, kind, quote]);
  return {
    choice: quote?.automatic ? {id: 'automatic'} : choice, choose, quote, fee, retry,
    loading: Boolean(kind && (!current || current.loading)),
    error: current?.error,
    canChoose: kind === 'btc' || Boolean(quote?.tiers),
  };
}
