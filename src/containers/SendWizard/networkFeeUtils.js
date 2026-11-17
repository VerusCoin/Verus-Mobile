import BigNumber from 'bignumber.js';
import {ethers} from 'ethers';
import {ELECTRUM, ETH, ERC20} from '../../utils/constants/intervalConstants';
import {DEFAULT_MAX_FEE_RATE_PER_BYTE} from '../../utils/api/channels/electrum/transactionFee';
import {plainSendFeeAmounts} from '../../utils/web3/plainSendFees';

export const FEE_TIERS = [
  {id: 'slow', title: 'Slow', btcKey: 'slowest', btcTime: 'About 1 hour', ethTime: 'About 1 min'},
  {id: 'normal', title: 'Normal', btcKey: 'average', btcTime: 'About 30 min', ethTime: 'About 30 sec'},
  {id: 'fast', title: 'Fast', btcKey: 'fastest', btcTime: 'About 10 min', ethTime: 'About 15 sec'},
];

export const networkFeeKind = (simpleSend, channel, coin) => {
  if (!simpleSend) return null;
  const parent = channel?.split('.')[0];
  if ([ETH, ERC20].includes(parent)) return 'eth';
  return parent === ELECTRUM && coin?.id === 'BTC' && coin?.fee == null ? 'btc' : null;
};

export const maxBTCFeeRate = coin => coin?.max_fee_rate_per_byte ?? DEFAULT_MAX_FEE_RATE_PER_BYTE;
export const formatGwei = wei => wei == null ? null : ethers.formatUnits(wei, 'gwei').replace(/\.0$/, '');
export const formatFeeAmount = (amount, ticker, approximate = false) =>
  amount == null ? null : `${approximate ? '≈ ' : ''}${BigNumber(amount).decimalPlaces(8, BigNumber.ROUND_UP).toFixed()} ${ticker}`;

const parseGwei = value => {
  const text = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,9})?$/.test(text) || text.length > 40) return null;
  try { return ethers.parseUnits(text, 'gwei'); } catch (_) { return null; }
};

export const customNetworkFee = (kind, {rate = '', base = '', priority = ''}, quote, maximum) => {
  if (kind === 'btc') {
    const number = Number(rate);
    if (rate && BigNumber(rate).isGreaterThan(maximum)) return {error: 'Fee rate is too high.'};
    if (!/^\d+$/.test(rate) || !Number.isSafeInteger(number) || number < 1 || number > maximum) {
      return {error: rate ? 'Enter a whole number of at least 1.' : null};
    }
    return {fee: {feePerByte: number}};
  }
  const maxBase = parseGwei(base);
  const tip = parseGwei(priority);
  if (maxBase == null || tip == null || maxBase <= BigInt(0)) return {
    baseError: base.trim() && (maxBase == null || maxBase <= BigInt(0)) ? 'Enter a number above 0.' : null,
    priorityError: priority.trim() && tip == null ? 'Enter a number of 0 or more.' : null,
  };
  const maximumWei = maxBase + tip;
  if (maximumWei < BigInt(quote?.floor || 0)) {
    return {error: `Use a total of at least ${formatGwei(quote.floor)} Gwei.`};
  }
  return {fee: {
    maxFeePerGas: maximumWei.toString(), maxPriorityFeePerGas: tip.toString(),
    baseFeePerGas: quote?.baseFeePerGas,
  }};
};

export const arrivalForFee = (kind, choice, quote) => {
  if (!quote?.tiers) return choice.id === 'custom' ? 'Can take a long time' : '1-5 minutes';
  if (choice.id !== 'custom') {
    const tier = FEE_TIERS.find(item => item.id === choice.id);
    return tier?.[kind === 'btc' ? 'btcTime' : 'ethTime'];
  }
  const custom = kind === 'btc' ? BigInt(choice.fee.feePerByte) : BigInt(choice.fee.maxPriorityFeePerGas);
  for (let i = FEE_TIERS.length - 1; i >= 0; i--) {
    const value = kind === 'btc' ? BigInt(quote.tiers[i].feePerByte) : BigInt(quote.tiers[i].maxPriorityFeePerGas);
    if (custom >= value) return FEE_TIERS[i][kind === 'btc' ? 'btcTime' : 'ethTime'];
  }
  return 'Can take a long time';
};

export const isHighNetworkFee = (kind, fee, quote) => {
  const fast = quote?.tiers?.[2];
  if (!fee || !fast) return false;
  if (kind === 'btc') return BigInt(fee.feePerByte) > BigInt(fast.feePerByte) * BigInt(2);
  if (quote.baseFeePerGas == null) return false;
  const baseFeePerGas = BigInt(quote.baseFeePerGas);
  const effectivePrice = candidate => {
    const maximum = BigInt(candidate.maxFeePerGas);
    const price = baseFeePerGas + BigInt(candidate.maxPriorityFeePerGas);
    return price < maximum ? price : maximum;
  };
  return effectivePrice(fee) > effectivePrice(fast) * BigInt(2);
};

export const previewNetworkFee = (kind, fee, review, quote) => {
  if (!fee || !review) return null;
  if (kind === 'btc') {
    return review.estimatedByteSize == null ? null : {
      likelyFee: BigNumber(fee.feePerByte).times(review.estimatedByteSize).dividedBy(1e8).toFixed(),
    };
  }
  if (review.estimatedGas == null || review.params?.gasLimit == null) return null;
  return plainSendFeeAmounts(review.estimatedGas, review.params.gasLimit, fee, quote?.baseFeePerGas);
};
