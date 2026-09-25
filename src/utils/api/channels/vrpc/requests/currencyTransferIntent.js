import BigNumber from 'bignumber.js';
import {Transaction, networks, smarttxs} from '@bitgo/utxo-lib';
import {
  DEST_ID,
  DEST_PKH,
  EVALS,
  ReserveTransfer,
  TransferDestination,
  fromBase58Check,
  toBase58Check,
} from 'verus-typescript-primitives';
import {IS_FRACTIONAL_FLAG, IS_GATEWAY_FLAG} from '../../../../constants/currencies';
import {I_ADDRESS_VERSION, R_ADDRESS_VERSION} from '../../../../constants/constants';
import {getSendCurrencyTransaction} from './getSendCurrencyTransaction';
import {getSingleSendCurrencyOutput} from './sendCurrencyOutputValidation';

const fractional = definition => (definition.options & IS_FRACTIONAL_FLAG) !== 0;
const reserveOf = (definition, currency) =>
  fractional(definition) && Array.isArray(definition.currencies) && definition.currencies.includes(currency);
const systemOf = (id, definition) =>
  (definition.options & IS_GATEWAY_FLAG) !== 0 ? definition.gatewayid || id : definition.systemid;

const refundDestination = value => {
  let destination = value;
  if (typeof value === 'string') {
    const {hash, version} = fromBase58Check(value);
    if (version !== R_ADDRESS_VERSION && version !== I_ADDRESS_VERSION) {
      throw new Error('Refund destination must be a plain transparent address or VerusID.');
    }
    destination = new TransferDestination({
      type: version === R_ADDRESS_VERSION ? DEST_PKH : DEST_ID,
      destinationBytes: hash,
    });
  }
  if (!(destination instanceof TransferDestination) ||
    ![DEST_PKH, DEST_ID].some(type => destination.type.eq(type)) ||
    destination.destinationBytes.length !== 20 || destination.gatewayID || destination.gatewayCode ||
    !destination.fees.isZero() || destination.auxDests.length !== 0) {
    throw new Error('Refund destination must be a plain transparent address or VerusID.');
  }
  return destination;
};

// Resolve the route from the request and currency definitions. The separate zero-amount
// quote supplies only fee allocations, never the expected route or refund destinations.
// Definitions and fee estimates retain their existing RPC trust; this does not authenticate them.
export const getCurrencyTransferIntentContext = async (
  systemId, output, source, currencyDefs, loadCurrency,
) => {
  if (['burn', 'burnweight', 'mintnew'].some(key => output[key]) ||
    ['mapto', 'vdxftag'].some(key => output[key] != null)) {
    throw new Error('Unsupported requested RPC transfer operation.');
  }
  const refundto = refundDestination(output.refundto == null ? source : output.refundto);
  const definition = async id => {
    if (!currencyDefs.has(id)) {
      const resolved = await loadCurrency(id);
      if (resolved !== id) throw new Error('Currency definition does not match the requested currency.');
    }
    const result = currencyDefs.get(id);
    if (!id || !result || !result.systemid || !Number.isInteger(result.options) ||
      (result.currencyid != null && result.currencyid !== id)) {
      throw new Error(`Missing currency definition for ${id}.`);
    }
    return result;
  };
  const currentDefinition = await definition(systemId);
  const sourceDefinition = await definition(output.currency);
  const feeCurrency = output.feecurrency || systemId;
  await definition(feeCurrency);
  const exportDefinition = output.exportto ? await definition(output.exportto) : null;
  const exportSystem = exportDefinition ? systemOf(output.exportto, exportDefinition) : systemId;
  await definition(exportSystem);
  const converting = output.convertto != null && output.convertto !== output.currency;
  let importCurrency;

  if (converting) {
    const targetDefinition = await definition(output.convertto);
    if (output.via != null) {
      const viaDefinition = await definition(output.via);
      if (output.preconvert || !reserveOf(viaDefinition, output.currency) ||
        !reserveOf(viaDefinition, output.convertto)) {
        throw new Error('Invalid reserve-to-reserve conversion relationship.');
      }
      importCurrency = output.via;
    } else if (reserveOf(targetDefinition, output.currency)) {
      importCurrency = output.convertto;
    } else if (!output.preconvert && reserveOf(sourceDefinition, output.convertto)) {
      importCurrency = output.currency;
    } else {
      throw new Error('Invalid reserve/fractional conversion relationship.');
    }
  } else {
    if (output.preconvert || !exportDefinition || exportSystem === systemId) {
      throw new Error('A non-converting reserve transfer requires an export route.');
    }
    importCurrency = output.via || (feeCurrency === exportSystem ? output.exportto :
      fractional(exportDefinition) ? output.exportto :
        exportDefinition.gatewayconverterid || currentDefinition.gatewayconverterid || output.exportto);
  }

  const importer = await definition(importCurrency);
  const processingSystem = output.preconvert ? systemId : systemOf(importCurrency, importer);
  if (output.preconvert && (exportSystem !== systemId || importer.launchsystemid !== systemId ||
    feeCurrency !== systemId || (output.exportto && systemOf(importCurrency, importer) !== systemId))) {
    throw new Error('Only local fractional preconversion with native fees is supported.');
  }
  if (processingSystem !== systemId && processingSystem !== exportSystem) {
    throw new Error('Converter system does not match the requested export.');
  }
  const route = {importCurrency, system: processingSystem};
  if (processingSystem === systemId && exportSystem !== systemId) {
    if (!reserveOf(importer, systemId) || !reserveOf(importer, exportSystem)) {
      throw new Error('Unsupported local gateway converter relationship.');
    }
    route.gateway = {system: exportSystem, code: toBase58Check(Buffer.alloc(20), I_ADDRESS_VERSION)};
  }

  const quote = await getSendCurrencyTransaction(
    systemId, output.currency, 0, output.address.getAddressString(), output.exportto,
    output.convertto, feeCurrency, output.via, source, output.vdxftag,
    {preconvert: output.preconvert, refundto: refundto.getAddressString()},
  );
  if (quote.error) throw new Error(quote.error.message);
  const transaction = Transaction.fromHex(quote.result.hextx, networks.verus);
  const unpacked = smarttxs.unpackOutput(getSingleSendCurrencyOutput(transaction), systemId);
  const transfer = unpacked.params && unpacked.params.length === 1 && unpacked.params[0].data;
  if (transaction.ins.length !== 0 || !(transfer instanceof ReserveTransfer) ||
    unpacked.params[0].eval !== EVALS.EVAL_RESERVE_TRANSFER || transfer.feeCurrencyID !== feeCurrency) {
    throw new Error('Invalid currency transfer fee quote.');
  }
  const transferSatoshis = transfer.feeAmount.toString();
  const destinationSatoshis = transfer.transferDestination.fees.toString();
  if (![transferSatoshis, destinationSatoshis].every(value => /^(0|[1-9][0-9]*)$/.test(value))) {
    throw new Error('Invalid currency transfer fee quote.');
  }
  const total = BigNumber(transferSatoshis).plus(destinationSatoshis);
  const quotedTotal = BigNumber(quote.result.outputtotals && quote.result.outputtotals[feeCurrency]).times('100000000');
  if (!quotedTotal.isFinite() || !quotedTotal.isInteger() || !total.eq(quotedTotal)) {
    throw new Error('Currency transfer fee quote totals do not match.');
  }
  if (Object.entries(quote.result.outputtotals).some(([currency, value]) =>
    currency !== feeCurrency && !BigNumber(value).isZero())) {
    throw new Error('Currency transfer fee quote contains unexpected currency totals.');
  }
  if (output.feesatoshis != null && (!/^(0|[1-9][0-9]*)$/.test(output.feesatoshis) ||
    !total.eq(output.feesatoshis))) {
    throw new Error('Currency transfer fee quote does not match the requested fee.');
  }
  return {
    context: {
      currencyDefinitions: Object.fromEntries(currencyDefs),
      route,
      fees: {currency: feeCurrency, transferSatoshis, destinationSatoshis},
      auxiliaryDestinations: [refundto],
    },
    refundto,
    totalFeeSatoshis: total.toFixed(0),
  };
};
