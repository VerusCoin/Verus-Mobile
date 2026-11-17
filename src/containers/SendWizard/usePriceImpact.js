import {useEffect, useMemo, useRef, useState} from 'react';
import BigNumber from 'bignumber.js';
import {estimateConversion} from '../../utils/api/channels/vrpc/requests/estimateConversion';
import {useSendWizard} from './SendWizardContext';
import {
  getImpactLevel,
  getImpactLoss,
  getPriceImpact,
  getSuggestedAmount,
  IMPACT_LEVEL,
  IMPACT_SUGGESTION_TARGET,
} from './priceImpact';

// A small trade is worth about this much in the display currency. It is the
// market price sample, so it must not move the basket itself.
const SAMPLE_VALUE = 1;
const MIN_SAMPLE = BigNumber('0.00000001');
const SUGGESTION_DELAY_MS = 300;

export const getSampleAmount = rate => {
  const value = BigNumber(rate);
  if (!value.isFinite() || !value.isGreaterThan(0)) return BigNumber(1);
  return BigNumber.maximum(
    MIN_SAMPLE,
    BigNumber(SAMPLE_VALUE).dividedBy(value).decimalPlaces(8, BigNumber.ROUND_UP),
  );
};

// Quotes one conversion amount on the selected route. Resolves to the output
// or null when the daemon cannot quote it.
const quoteOutput = async ({channel, sourceCoin, target, route, amount}) => {
  try {
    const result = await estimateConversion(
      channel?.split('.')[2] || sourceCoin.system_id || sourceCoin.id,
      sourceCoin.currency_id || sourceCoin.id,
      target.transactionCurrency,
      amount,
      route?.via,
      Boolean(route?.preconvert),
    );
    const output = result?.result?.estimatedcurrencyout;
    if (result?.error || output == null) return null;
    const value = BigNumber(output);
    return value.isFinite() && value.isGreaterThan(0) ? value : null;
  } catch (error) {
    return null;
  }
};

// Market price and price impact for a conversion on the Amount step.
// `amount` is a finite BigNumber in source units; `output` is the quoted
// estimate for it. The market price is fetched once per route, not per amount.
export const usePriceImpact = ({
  channel,
  sourceCoin,
  target,
  route,
  amount,
  output,
  rate,
}) => {
  const {setMarketPrice, state: wizardState} = useSendWizard();
  const [market, setMarket] = useState({key: null, price: null});
  const [suggestion, setSuggestion] = useState(null);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  // A pre-conversion has no market price: everyone gets the launch price.
  const routeKey =
    target?.isConversion && route && !route.preconvert && sourceCoin
      ? [channel, sourceCoin.id, target.transactionCurrency, route.key].join('|')
      : null;

  useEffect(() => {
    setSuggestion(null);
    if (!routeKey) {
      setMarket({key: null, price: null});
      setMarketPrice(null);
      return undefined;
    }

    let active = true;
    const sample = getSampleAmount(rateRef.current);
    setMarket({key: routeKey, price: null});
    quoteOutput({channel, sourceCoin, target, route, amount: sample}).then(
      sampleOutput => {
        if (!active) return;
        const price = sampleOutput ? sampleOutput.dividedBy(sample) : null;
        setMarket({key: routeKey, price});
        setMarketPrice(price ? price.toString() : null);
      },
    );

    return () => {
      active = false;
    };
    // The route key covers channel, source, target and route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const marketPrice = market.key === routeKey ? market.price : null;
  const amountKey = amount?.isFinite() ? amount.toString() : '';
  const outputKey = output == null ? '' : String(output);

  // Anything that clears the wizard's copy while this route still has a price
  // must not leave Confirm without it.
  const contextPrice = wizardState.marketPrice;
  const priceText = marketPrice ? marketPrice.toString() : null;
  useEffect(() => {
    if (priceText && contextPrice !== priceText) setMarketPrice(priceText);
  }, [contextPrice, priceText, setMarketPrice]);

  const impact = useMemo(() => {
    if (!marketPrice || !amountKey || !outputKey) return null;
    return getPriceImpact({amount: amountKey, output: outputKey, marketPrice});
  }, [amountKey, marketPrice, outputKey]);
  const impactKey = impact ? impact.toString() : '';
  const level = getImpactLevel(impact);

  useEffect(() => {
    setSuggestion(null);
    if (level !== IMPACT_LEVEL.WARNING && level !== IMPACT_LEVEL.DANGER) {
      return undefined;
    }

    const candidate = getSuggestedAmount({
      amount: amountKey,
      impact: impactKey,
      target: level === IMPACT_LEVEL.WARNING
        ? Number(impactKey) / 2
        : IMPACT_SUGGESTION_TARGET,
    });
    if (!candidate) return undefined;

    let active = true;
    const timer = setTimeout(async () => {
      const candidateOutput = await quoteOutput({
        channel,
        sourceCoin,
        target,
        route,
        amount: candidate,
      });
      if (!active || !candidateOutput) return;
      // Show the measured impact, never the one the formula aimed for.
      const measured = getPriceImpact({
        amount: candidate,
        output: candidateOutput,
        marketPrice,
      });
      if (measured && measured.isLessThan(impactKey)) {
        setSuggestion({amount: candidate, impact: measured});
      }
    }, SUGGESTION_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
    // Quote inputs are the same ones that define the keys below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountKey, impactKey, level, marketPrice, routeKey]);

  return {
    impact,
    level,
    loss: impact && amountKey ? getImpactLoss(amountKey, impact) : null,
    marketPrice,
    suggestion,
  };
};

export default usePriceImpact;
