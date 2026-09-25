import {address, networks, smarttxs, Transaction} from '@bitgo/utxo-lib';
import {
  BigNumber as BN,
  DEST_ETH,
  DEST_PKH,
  FLAG_DEST_AUX,
  FLAG_DEST_GATEWAY,
  OptCCParams,
  ReserveTransfer,
  TransferDestination,
  compile,
  decompile,
  fromBase58Check,
} from 'verus-typescript-primitives';
import {preflightCurrencyTransfer} from '../../api/channels/vrpc/requests/preflight';
import {getAddressBalances} from '../../api/channels/vrpc/requests/getAddressBalances';
import {getSpendableUtxos} from '../../api/channels/vrpc/requests/getAddressUtxos';
import {getInfo} from '../../api/channels/vrpc/requests/getInfo';
import {fundRawTransaction} from '../../api/channels/vrpc/requests/fundRawTransaction';
import {getSendCurrencyTransaction} from '../../api/channels/vrpc/requests/getSendCurrencyTransaction';
import {estimateConversion} from '../../api/channels/vrpc/requests/estimateConversion';
import {getCurrency} from '../../api/channels/verusid/callCreators';

jest.mock('../../api/channels/vrpc/requests/getAddressBalances', () => ({getAddressBalances: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getAddressUtxos', () => ({getSpendableUtxos: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getInfo', () => ({getInfo: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/fundRawTransaction', () => ({fundRawTransaction: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getSendCurrencyTransaction', () => ({getSendCurrencyTransaction: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/estimateConversion', () => ({estimateConversion: jest.fn()}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getCurrency: jest.fn(), getIdentity: jest.fn()}));
jest.mock('../../CoinData/CoinData', () => ({getSystemNameFromSystemId: value => value}));
jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {isSystemIdActivated: () => false},
}));
jest.mock('../../../store', () => ({__esModule: true, default: {getState: jest.fn()}}));

const SYSTEM = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const REMOTE = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const GATEWAY = 'i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X';
const CONVERTER = 'iECDGNNufPkSa9aHfbnQUjvhRN6YGR8eKM';
const ZERO_CODE = 'i3UXS5QPRQGNRDDqVnyWTnmFCTHDbzmsYk';
const SOURCE = 'RTqQe58LSj2yr5CrwYFwcsAQ1edQwmrkUU';
const REFUND = 'R9J8E2no2HVjQmzX6Ntes2ShSGcn7WiRcx';
const CHANNEL = `vrpc.${SOURCE}.${SYSTEM}`;
const COIN = {id: 'VRSC', system_id: SYSTEM};
const ACCOUNT = {id: 'test', keys: {VRSC: {[CHANNEL]: {addresses: [SOURCE]}}}};
const INPUT = {
  txid: 'ab'.repeat(32), outputIndex: 0, satoshis: 500000000,
  script: address.toOutputScript(SOURCE, networks.verus).toString('hex'),
  isspendable: true,
};
const pkh = value => new TransferDestination({type: DEST_PKH, destinationBytes: fromBase58Check(value).hash});
const definitions = {
  [SYSTEM]: {options: 256, systemid: SYSTEM, launchsystemid: SYSTEM},
  [REMOTE]: {options: 256, systemid: REMOTE, launchsystemid: SYSTEM},
  [GATEWAY]: {options: 128, systemid: SYSTEM, gatewayid: GATEWAY, gatewayconverterid: CONVERTER},
  [CONVERTER]: {options: 1, systemid: SYSTEM, launchsystemid: SYSTEM, currencies: [SYSTEM, GATEWAY]},
};

const makeOutput = kind => ({
  currency: SYSTEM,
  satoshis: '100000000',
  ...(kind === 'gateway' ? {
    exportto: GATEWAY, convertto: GATEWAY, via: CONVERTER,
    address: new TransferDestination({type: DEST_ETH, destinationBytes: Buffer.alloc(20, 1)}),
  } : kind === 'preconvert' ? {
    exportto: SYSTEM, convertto: CONVERTER, preconvert: true,
    address: pkh(SOURCE), refundto: pkh(REFUND),
  } : {exportto: REMOTE, address: pkh(SOURCE)}),
});

// Fixed protocol fixtures are independent of the RPC candidate being validated.
const makeTransaction = (output, kind, principal) => {
  const gateway = kind === 'gateway';
  const destination = new TransferDestination({
    type: output.address.type.or(FLAG_DEST_AUX).or(gateway ? FLAG_DEST_GATEWAY : new BN(0)),
    destinationBytes: output.address.destinationBytes,
    auxDests: [output.refundto || pkh(SOURCE)],
    ...(gateway ? {gatewayID: GATEWAY, gatewayCode: ZERO_CODE, fees: new BN(30000)} : {}),
  });
  const hex = smarttxs.createUnfundedCurrencyTransfer(SYSTEM, [{
    currency: SYSTEM, satoshis: principal, address: destination,
    convertto: output.convertto, via: output.via, preconvert: output.preconvert,
    ...(kind === 'direct' ? {exportto: REMOTE, bridgeid: REMOTE} : {}),
    feecurrency: SYSTEM, feesatoshis: '20000',
  }], networks.verus, 200);
  const tx = Transaction.fromHex(hex, networks.verus);
  tx.outs[0].value = Number(principal) + (gateway ? 50000 : 20000);
  return tx.toHex();
};

const rewriteTransfer = (hex, mutate) => {
  const tx = Transaction.fromHex(hex, networks.verus);
  const chunks = decompile(tx.outs[0].script);
  const params = OptCCParams.fromChunk(chunks[2]);
  const transfer = new ReserveTransfer();
  transfer.fromBuffer(params.vData[0]);
  mutate(transfer);
  params.vData[0] = transfer.toBuffer();
  chunks[2] = params.toChunk();
  tx.outs[0].script = compile(chunks);
  return tx.toHex();
};

const prepareRpc = (kind, mutate) => {
  const output = makeOutput(kind);
  const quote = makeTransaction(output, kind, '0');
  let candidate = makeTransaction(output, kind, output.satoshis);
  if (mutate) candidate = rewriteTransfer(candidate, mutate);
  getSendCurrencyTransaction.mockImplementation(async (_system, _currency, amount) => ({
    result: {
      hextx: amount === 0 ? quote : candidate,
      outputtotals: {[SYSTEM]: kind === 'gateway' ? 0.0005 : 0.0002},
    },
  }));
  return output;
};

describe('RPC currency transfer intent validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getCurrency.mockImplementation(async (_system, id) => ({
      result: {currencyid: id, fullyqualifiedname: id, ...definitions[id]},
    }));
    getInfo.mockResolvedValue({result: {longestchain: 100}});
    getAddressBalances.mockResolvedValue({result: {currencybalance: {[SYSTEM]: 5}}});
    getSpendableUtxos.mockResolvedValue([INPUT]);
    estimateConversion.mockResolvedValue({result: {outputcurrencyid: GATEWAY, estimatedcurrencyout: 1}});
    fundRawTransaction.mockImplementation(async (_system, hex) => {
      const tx = Transaction.fromHex(hex, networks.verus);
      tx.addInput(Buffer.from(INPUT.txid, 'hex').reverse(), INPUT.outputIndex);
      tx.addOutput(address.toOutputScript(SOURCE, networks.verus), INPUT.satoshis - tx.outs[0].value - 10000);
      return {result: {hex: tx.toHex()}};
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('rejects a currency lookup that substitutes an explicitly requested ID', async () => {
    const output = prepareRpc('gateway');
    getCurrency.mockResolvedValueOnce({
      result: {currencyid: REMOTE, fullyqualifiedname: REMOTE, ...definitions[REMOTE]},
    });

    const result = await preflightCurrencyTransfer(COIN, CHANNEL, ACCOUNT, output);

    expect(result).toEqual({err: true, result: 'Currency definition does not match the requested currency.'});
    expect(getSendCurrencyTransaction).not.toHaveBeenCalled();
    expect(fundRawTransaction).not.toHaveBeenCalled();
  });

  it.each(['gateway', 'direct'])('validates and funds the approved %s transfer', async kind => {
    const output = prepareRpc(kind);
    const result = await preflightCurrencyTransfer(COIN, CHANNEL, ACCOUNT, output);

    expect(result).toMatchObject({err: false, result: {validation: {valid: true, sent: {[SYSTEM]: '100000000'}}}});
    expect(fundRawTransaction).toHaveBeenCalledTimes(1);
    expect(getSendCurrencyTransaction.mock.calls.map(call => call[2])).toEqual([0, 1]);
    for (const call of getSendCurrencyTransaction.mock.calls) {
      expect(call[10]).toMatchObject({refundto: SOURCE});
    }
  });

  it.each([
    ['conversion target', transfer => {transfer.secondReserveID = REMOTE;}],
    ['gateway route', transfer => {transfer.transferDestination.gatewayID = REMOTE;}],
    ['refund address', transfer => {transfer.transferDestination.auxDests[0] = pkh(REFUND);}],
    ['fee split with unchanged total', transfer => {
      transfer.feeAmount = transfer.feeAmount.addn(1);
      transfer.transferDestination.fees = transfer.transferDestination.fees.subn(1);
    }],
  ])('rejects a substituted %s before funding', async (_name, mutate) => {
    const result = await preflightCurrencyTransfer(COIN, CHANNEL, ACCOUNT, prepareRpc('gateway', mutate));

    expect(result.err).toBe(true);
    expect(result.result).toMatch(/match/i);
    expect(getSendCurrencyTransaction.mock.calls.map(call => call[2])).toEqual([0, 1]);
    expect(fundRawTransaction).not.toHaveBeenCalled();
  });

  it('rejects an explicit fee total that differs from the independent quote', async () => {
    const output = {...prepareRpc('gateway'), feesatoshis: '49999'};
    const result = await preflightCurrencyTransfer(COIN, CHANNEL, ACCOUNT, output);

    expect(result.err).toBe(true);
    expect(result.result).toMatch(/fee/i);
    expect(getSendCurrencyTransaction.mock.calls.map(call => call[2])).toEqual([0]);
    expect(fundRawTransaction).not.toHaveBeenCalled();
  });

  it('still rejects changes introduced during funding after intent validation passes', async () => {
    const output = prepareRpc('gateway');
    const fund = fundRawTransaction.getMockImplementation();
    fundRawTransaction.mockImplementation(async (...args) => {
      const response = await fund(...args);
      response.result.hex = rewriteTransfer(response.result.hex, transfer => {
        transfer.secondReserveID = REMOTE;
      });
      return response;
    });

    const result = await preflightCurrencyTransfer(COIN, CHANNEL, ACCOUNT, output);

    expect(result.err).toBe(true);
    expect(result.result).toMatch(/does not match unfunded component/i);
    expect(fundRawTransaction).toHaveBeenCalledTimes(1);
  });

  it('forwards explicit refund and preconversion to both quote and candidate', async () => {
    const output = prepareRpc('preconvert');
    const result = await preflightCurrencyTransfer(COIN, CHANNEL, ACCOUNT, output);

    expect(result).toMatchObject({err: false, result: {validation: {valid: true}}});
    expect(getSendCurrencyTransaction.mock.calls.map(call => call[2])).toEqual([0, 1]);
    for (const call of getSendCurrencyTransaction.mock.calls) {
      expect(call[10]).toEqual({preconvert: true, refundto: REFUND});
    }
    expect(fundRawTransaction).toHaveBeenCalledTimes(1);
  });
});
