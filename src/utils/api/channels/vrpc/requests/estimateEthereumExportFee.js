import BigNumber from 'bignumber.js';
import {DEST_ETH, TransferDestination, fromBase58Check} from 'verus-typescript-primitives';
import {getCurrency} from '../../verusid/callCreators';
import {coinsToSats, satsToCoins} from '../../../../math';
import {getCurrencyTransferIntentContext} from './currencyTransferIntent';
import {SEND_CURRENCY_PARENT_FEE} from './getSendCurrencyTransaction';

// Use the same validated, zero-amount quote as preflight. Its two fee legs do
// not depend on the sent amount or the Ethereum account bytes. This public
// source hash is only a placeholder for the unsigned returntx simulation;
// it is not a recipient and must never be used to build the user's payment.
export const estimateEthereumExportFee = async (systemId, source, route) => {
  const {hash} = fromBase58Check(source);
  const output = {
    ...route,
    satoshis: '0',
    address: new TransferDestination({type: DEST_ETH, destinationBytes: hash}),
    feecurrency: systemId,
  };
  const definitions = new Map();
  const loadCurrency = async id => {
    const response = await getCurrency(systemId, id);
    if (response.error || response.result?.currencyid !== id) {
      throw new Error('Fee unavailable.');
    }
    definitions.set(id, response.result);
    return id;
  };
  const quote = await getCurrencyTransferIntentContext(
    systemId, output, source, definitions, loadCurrency,
  );
  const fee = BigNumber(quote.totalFeeSatoshis).plus(
    coinsToSats(BigNumber(SEND_CURRENCY_PARENT_FEE)),
  );
  if (!fee.isFinite() || !fee.isInteger() || fee.isNegative()) {
    throw new Error('Fee unavailable.');
  }
  return {currencyId: systemId, amount: satsToCoins(fee).toFixed()};
};
