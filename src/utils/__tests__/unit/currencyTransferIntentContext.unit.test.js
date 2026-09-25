import {networks, smarttxs, Transaction} from '@bitgo/utxo-lib';
import {
  BigNumber as BN,
  DEST_ETH,
  DEST_PKH,
  FLAG_DEST_AUX,
  FLAG_DEST_GATEWAY,
  TransferDestination,
  toBase58Check,
} from 'verus-typescript-primitives';
import {getCurrencyTransferIntentContext} from '../../api/channels/vrpc/requests/currencyTransferIntent';
import {getSendCurrencyTransaction} from '../../api/channels/vrpc/requests/getSendCurrencyTransaction';
import VrpcProvider from '../../vrpc/vrpcInterface';

jest.mock('../../api/channels/vrpc/requests/getSendCurrencyTransaction', () => ({
  getSendCurrencyTransaction: jest.fn(),
}));
jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {getEndpoint: jest.fn()},
}));
jest.mock('../../constants/constants', () => ({I_ADDRESS_VERSION: 102, R_ADDRESS_VERSION: 60}));

const id = byte => toBase58Check(Buffer.alloc(20, byte), 102);
const system = id(1);
const remote = id(2);
const converter = id(3);
const reserve = id(4);
const gateway = id(5);
const own = new TransferDestination({type: DEST_PKH, destinationBytes: Buffer.alloc(20, 6)});
const source = own.getAddressString();
const recipient = new TransferDestination({type: DEST_PKH, destinationBytes: Buffer.alloc(20, 7)});
const zeroCode = id(0);

const definitions = () => new Map([
  [system, {currencyid: system, systemid: system, options: 256, gatewayconverterid: converter}],
  [remote, {currencyid: remote, systemid: remote, options: 256, launchsystemid: system}],
  [converter, {currencyid: converter, systemid: system, options: 1, currencies: [system, remote, gateway, reserve]}],
  [reserve, {currencyid: reserve, systemid: system, options: 32}],
  [gateway, {currencyid: gateway, systemid: system, gatewayid: gateway, options: 128, gatewayconverterid: converter}],
]);

const feeQuote = (destinationFee = '1000', feeCurrency = system) => {
  const address = new TransferDestination({
    type: DEST_PKH.or(FLAG_DEST_GATEWAY).or(FLAG_DEST_AUX),
    destinationBytes: recipient.destinationBytes,
    gatewayID: remote,
    gatewayCode: zeroCode,
    fees: new BN(destinationFee),
    auxDests: [own],
  });
  return {
    result: {
      hextx: smarttxs.createUnfundedCurrencyTransfer(system, [{
        currency: system, satoshis: '0', address, convertto: converter,
        feecurrency: feeCurrency, feesatoshis: '20010',
      }], networks.verus, 100),
      outputtotals: {[feeCurrency]: '0.00021010'},
    },
  };
};

let currencyDefs;
let loadCurrency;
const getContext = output => getCurrencyTransferIntentContext(system, {
  currency: system, satoshis: '100000000', address: recipient, ...output,
}, source, currencyDefs, loadCurrency);

beforeEach(() => {
  jest.clearAllMocks();
  currencyDefs = definitions();
  loadCurrency = jest.fn(async currency => {
    currencyDefs.set(currency, definitions().get(currency));
    return currency;
  });
  getSendCurrencyTransaction.mockResolvedValue(feeQuote());
});

it('independently resolves and loads the local fee converter before an ETH export', async () => {
  currencyDefs.delete(converter);
  const address = new TransferDestination({type: DEST_ETH, destinationBytes: Buffer.alloc(20, 8)});
  const result = await getContext({exportto: gateway, address});

  expect(loadCurrency).toHaveBeenCalledWith(converter);
  expect(result.context.route).toEqual({
    importCurrency: converter, system, gateway: {system: gateway, code: zeroCode},
  });
  expect(result.context.auxiliaryDestinations).toEqual([own]);
  expect(result.context.fees).toEqual({currency: system, transferSatoshis: '20010', destinationSatoshis: '1000'});
  expect(result.totalFeeSatoshis).toBe('21010');
  expect(getSendCurrencyTransaction).toHaveBeenCalledWith(
    system, system, 0, address.getAddressString(), gateway, undefined, system, undefined,
    source, undefined, {preconvert: undefined, refundto: source},
  );
});

it.each([
  ['to fractional', {convertto: converter}, converter, system],
  ['from fractional', {currency: converter, convertto: reserve}, converter, system],
  ['via a remote converter', {convertto: remote, via: converter, exportto: remote}, converter, remote],
  ['direct export with destination fees', {exportto: remote, feecurrency: remote}, remote, remote],
])('selects the %s route independently of the quote', async (_, output, importer, processingSystem) => {
  if (processingSystem === remote && importer === converter) {
    currencyDefs.set(converter, {...currencyDefs.get(converter), systemid: remote});
  }
  if (output.feecurrency === remote) getSendCurrencyTransaction.mockResolvedValue(feeQuote('1000', remote));
  const result = await getContext(output);
  expect(result.context.route).toEqual({importCurrency: importer, system: processingSystem});
});

it('chooses the destination fee converter before the current system converter', async () => {
  currencyDefs.set(remote, {...currencyDefs.get(remote), gatewayconverterid: reserve});
  currencyDefs.set(reserve, {systemid: remote, options: 1, currencies: [system, remote]});
  const result = await getContext({exportto: remote});
  expect(result.context.route).toEqual({importCurrency: reserve, system: remote});
});

it('pins an explicit refund independently of the fee quote refund', async () => {
  const result = await getContext({exportto: remote, refundto: recipient});
  expect(result.refundto).toBe(recipient);
  expect(result.context.auxiliaryDestinations).toEqual([recipient]);
  expect(getSendCurrencyTransaction.mock.calls[0][10]).toEqual({preconvert: undefined, refundto: recipient.getAddressString()});
});

it.each([
  ['unsupported operation', {burn: true}],
  ['ETH refund', {refundto: new TransferDestination({type: DEST_ETH, destinationBytes: Buffer.alloc(20, 8)})}],
  ['nested refund', {refundto: new TransferDestination({type: DEST_PKH.or(FLAG_DEST_AUX), destinationBytes: own.destinationBytes, auxDests: [own]})}],
])('rejects %s before requesting a quote', async (_, output) => {
  await expect(getContext({exportto: remote, ...output})).rejects.toThrow();
  expect(getSendCurrencyTransaction).not.toHaveBeenCalled();
});

it('rejects converters on an unrelated system before requesting a quote', async () => {
  currencyDefs.set(converter, {...currencyDefs.get(converter), systemid: id(9)});
  await expect(getContext({via: converter, convertto: remote, exportto: remote})).rejects.toThrow('Converter system');
  expect(getSendCurrencyTransaction).not.toHaveBeenCalled();
});

it.each([
  ['aggregate mismatch', quote => {quote.result.outputtotals[system] = '0.00021011';}, 'totals do not match'],
  ['unexpected currency', quote => {quote.result.outputtotals[reserve] = 1;}, 'unexpected currency totals'],
  ['extra output', quote => {
    const tx = Transaction.fromHex(quote.result.hextx, networks.verus);
    tx.addOutput(tx.outs[0].script, 0);
    quote.result.hextx = tx.toHex();
  }, 'exactly one output'],
])('rejects a quote with %s', async (_, mutate, message) => {
  const quote = feeQuote();
  mutate(quote);
  getSendCurrencyTransaction.mockResolvedValue(quote);
  await expect(getContext({exportto: remote})).rejects.toThrow(message);
});

it('requires the independent quote total to equal an explicitly requested fee', async () => {
  await expect(getContext({exportto: remote, feesatoshis: '21009'})).rejects.toThrow('requested fee');
  await expect(getContext({exportto: remote, feesatoshis: '21010'})).resolves.toMatchObject({totalFeeSatoshis: '21010'});
});

it('forwards preconvert and explicit refund options through the actual RPC wrapper', async () => {
  const sendCurrency = jest.fn(async () => ({result: {}}));
  VrpcProvider.getEndpoint.mockReturnValue({sendCurrency});
  const wrapper = jest.requireActual('../../api/channels/vrpc/requests/getSendCurrencyTransaction');
  await wrapper.getSendCurrencyTransaction(system, system, 0, recipient.getAddressString(),
    undefined, converter, system, undefined, source, undefined,
    {preconvert: true, refundto: source});
  expect(sendCurrency).toHaveBeenCalledWith(source, [expect.objectContaining({
    amount: 0, preconvert: true, refundto: source,
  })], 1, 0.0001, true);
});
