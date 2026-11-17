import BigNumber from 'bignumber.js';
import VrpcProvider from '../vrpc/vrpcInterface';
import {getAddressBalances} from '../api/channels/vrpc/requests/getAddressBalances';
import {registrationRpcResult} from '../api/channels/verusid/requests/registerIdentity';
import {assertRegistrationContext} from './registration';

// Linked IDs are payment candidates, not proof of spending authority. The
// registration builder verifies their current on-chain authority before payment.
export const registrationFundingSources = (coin, account, linkedIds = {}) => {
  const signingAddress = account?.keys?.[coin?.id]?.vrpc?.addresses?.[0];
  if (!coin || !signingAddress) return [];

  const identities = {
    ...(linkedIds[coin.testnet ? 'VRSCTEST' : 'VRSC'] || {}),
    ...(linkedIds[coin.id] || {}),
  };
  return [
    {address: signingAddress, signingAddress, fundingName: 'Wallet address', isIdentity: false},
    ...Object.entries(identities)
      .filter(([address, name]) => address !== signingAddress && typeof name === 'string')
      .map(([address, fundingName]) => ({address, signingAddress, fundingName, isIdentity: true}))
      .sort((left, right) => left.fundingName.localeCompare(right.fundingName)),
  ];
};

export const registrationFundingBalance = (coin, source, balances = {}) =>
  balances[`vrpc.${source?.address}.${coin?.system_id}`]?.[coin?.id]?.confirmed;

export const registrationCurrencyBalance = (currencyId, source, systemCoin, coins = [], balances = {}, reads = {}) => {
  const live = reads[source?.address];
  if (live?.status === 'ready') return live.amounts[currencyId] ?? '0';
  const coin = currencyId === systemCoin?.currency_id ? systemCoin : coins.find(item =>
    item.system_id === systemCoin?.system_id && item.currency_id === currencyId);
  return coin ? registrationFundingBalance(coin, source, balances) : undefined;
};

// Unknown is distinct from a zero balance. A single source must cover all
// currencies; balances from different addresses are never added together.
export const registrationFundingState = (quote, source, systemCoin, coins, balances, reads = {}, secondPayment = false) => {
  if (!quote || !source || !systemCoin) return {status: 'checking'};
  if (reads[source.address]?.status === 'error') return {status: 'error'};
  let unknown = false;
  const amounts = secondPayment ? quote.totalRequired : quote.totalOperationRequired;
  for (const [currencyId, required] of Object.entries(amounts)) {
    const value = registrationCurrencyBalance(currencyId, source, systemCoin, coins, balances, reads);
    const balance = value == null ? null : new BigNumber(value);
    if (!balance?.isFinite() || balance.isNegative()) { unknown = true; continue; }
    if (balance.times('100000000').lt(required)) return {status: 'short', currencyId,
      balance: balance.toFixed(), missing: new BigNumber(required).minus(balance.times('100000000')).toFixed(0)};
  }
  return {status: unknown ? 'checking' : 'enough'};
};

// Quote amounts are atomic integers. Ledger balances are decimal coins. Check
// every quoted currency on this source and chain. The separate funding state
// blocks unknown reads; this predicate identifies only a known shortfall.
export const registrationHasInsufficientFunds = (quote, source, systemCoin, coins, balances, reads) =>
  registrationFundingState(quote, source, systemCoin, coins, balances, reads).status === 'short';

// Compare decimal balances without rounding. Missing balances cannot outrank
// a funded source; equal balances retain the stable source order.
export const preferredRegistrationFundingSource = (sources, coin, balances = {}, quote, coins = [], reads = {}) => {
  const funded = quote && sources.find(source => registrationFundingState(quote, source, coin, coins, balances, reads).status === 'enough');
  if (funded) return funded;
  let preferred = sources[0];
  let greatest = new BigNumber(0);
  sources.forEach(source => {
    const balance = new BigNumber(quote
      ? registrationCurrencyBalance(quote.feePricingCurrencyID || quote.issuerID, source, coin, coins, balances, reads)
      : registrationFundingBalance(coin, source, balances));
    if (balance.isFinite() && balance.gt(greatest)) {
      preferred = source;
      greatest = balance;
    }
  });
  return preferred;
};

const balanceReads = new Map();
export const readRegistrationBalances = async (coin, source, context, fresh = false) => {
  assertRegistrationContext(context);
  const endpoint = VrpcProvider.getEndpoint(coin.system_id);
  const key = `${context.sessionScope.accountHash}:${context.sessionScope.sessionEpoch}:${endpoint.endpoint}:${coin.system_id}:${source.address}`;
  const old = balanceReads.get(key);
  if (!fresh && old && Date.now() < old.until) return old.promise;
  const entry = {until: Infinity};
  entry.promise = (async () => {
    const result = registrationRpcResult(await getAddressBalances(coin.system_id, [source.address], false, fresh), 'Get payer balance');
    assertRegistrationContext(context);
    const native = new BigNumber(result?.balance);
    const currencies = result?.currencybalance || {};
    if (result?.balance == null || !native.isFinite() || !native.isInteger() || native.isNegative() ||
        typeof currencies !== 'object' || Array.isArray(currencies))
      throw new Error('Payer balances could not be checked.');
    const amounts = {};
    for (const [id, value] of Object.entries(currencies)) {
      const amount = new BigNumber(value);
      if (value == null || !amount.isFinite() || amount.isNegative()) throw new Error('Payer balances could not be checked.');
      amounts[id] = amount.toFixed();
    }
    amounts[coin.system_id] = native.div('100000000').toFixed();
    entry.until = Date.now() + 5000;
    return {status: 'ready', amounts};
  })().catch(error => { if (balanceReads.get(key) === entry) balanceReads.delete(key); throw error; });
  balanceReads.set(key, entry);
  if (balanceReads.size > 64) balanceReads.delete(balanceReads.keys().next().value);
  return entry.promise;
};

// The fixed payer must cover every currency in the second-payment quote.
// This read creates no funding plan, approval, signature, or payment.
export const checkRegistrationFunds = async (review, coins, context) => {
  assertRegistrationContext(context);
  const coin = coins.find(item => item.id === review.chainTicker);
  if (!coin) throw new Error('Add this network wallet to check its payment address.');
  const source = {address: review.fundingAddress};
  const reads = {[source.address]: await readRegistrationBalances(coin, source, context, true)};
  return registrationFundingState(review.quote, source, coin, coins, {}, reads, true);
};
