import BigNumber from 'bignumber.js';
import {ECPair, networks} from '@bitgo/utxo-lib';
import {
  DEST_ETH,
  DEST_ID,
  DEST_PKH,
  TransferDestination,
  fromBase58Check,
  toIAddress,
} from 'verus-typescript-primitives';
import {preflightBridgeTransfer} from '../../api/channels/erc20/requests/preflight';
import {getWeb3ProviderForNetwork} from '../../web3/provider';
import {getCurrency} from '../../api/channels/verusid/callCreators';
import {getStandardEthBalance} from '../../api/channels/eth/callCreator';
import {ERC20, ETH} from '../../constants/intervalConstants';
import {
  DAI_CONTRACT_ADDRESS,
  ETH_BRIDGE_NAME,
  ETH_CONTRACT_ADDRESS,
  NULL_ETH_ADDRESS,
  VETH,
} from '../../constants/web3Constants';

jest.mock('../../web3/provider', () => ({
  getWeb3ProviderForNetwork: jest.fn(),
}));
jest.mock('../../api/channels/verusid/callCreators', () => ({
  getCurrency: jest.fn(),
}));
jest.mock('../../api/channels/eth/callCreator', () => ({
  getStandardEthBalance: jest.fn(),
}));
jest.mock('../../CoinData/CoinData', () => ({
  getSystemNameFromSystemId: systemId =>
    systemId === 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq' ? 'VRSCTEST' : 'VRSC',
}));
jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: jest.fn()},
}));

const fromAddress = '0x1111111111111111111111111111111111111111';
const publicKey = Buffer.from(
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  'hex',
);
const recipientHash = Buffer.alloc(20, 2);
const asHex = id => `0x${fromBase58Check(id).hash.toString('hex')}`;

function setup({source = VETH, erc20 = false, systemName = 'VRSC', pastPrelaunch = true} = {}) {
  const systemId = toIAddress(systemName, systemName);
  const id = name => toIAddress(name, systemName);
  const bridgeId = id(ETH_BRIDGE_NAME);
  const channel = erc20 ? ERC20 : ETH;
  const tokenAddress = !erc20 ? ETH_CONTRACT_ADDRESS : source === ETH_BRIDGE_NAME
    ? '0x4444444444444444444444444444444444444444' : DAI_CONTRACT_ADDRESS;
  const delegatorContract = {
    getAddress: jest.fn(async () => '0x3333333333333333333333333333333333333333'),
    bridgeConverterActive: {staticCall: jest.fn(async () => pastPrelaunch)},
    getTokenList: {staticCall: jest.fn(async () => [[asHex(id(source)), tokenAddress, 0, 0]])},
    sendTransfer: {
      estimateGas: jest.fn(async () => BigInt(100000)),
      staticCall: jest.fn(async () => true),
    },
  };
  delegatorContract.connect = jest.fn(() => delegatorContract);
  const tokenContract = {approve: {estimateGas: jest.fn(async () => BigInt(50000))}};
  tokenContract.connect = jest.fn(() => tokenContract);
  const getFeeData = jest.fn(async () => ({maxFeePerGas: BigInt(1000000000)}));
  getWeb3ProviderForNetwork.mockReturnValue({
    network: 'mainnet',
    InfuraProvider: {getFeeData},
    getVerusBridgeDelegatorContract: () => delegatorContract,
    getContract: () => tokenContract,
    getVrscSystem: () => systemId,
  });
  getCurrency.mockImplementation(async (_, name) => {
    let currencyid;
    try {
      currencyid = fromBase58Check(name).version === 102 ? name : id(name);
    } catch (_) {
      currencyid = id(name);
    }
    return {
      result: {
        currencyid,
        fullyqualifiedname: currencyid === bridgeId ? `Bridge.vETH.${systemName}@` : name,
        ...(currencyid === bridgeId ? {
          currencies: [systemId, id(VETH), id('DAI.vETH'), ...(systemName === 'VRSC' ? [id('MKR.vETH')] : [])],
        } : {}),
      },
    };
  });
  getStandardEthBalance.mockResolvedValue(BigNumber(10));
  const prepare = output => preflightBridgeTransfer(
    {id: 'SOURCE', proto: erc20 ? 'erc20' : 'eth', currency_id: tokenAddress, decimals: 18, network: 'mainnet', testnet: systemName === 'VRSCTEST'},
    channel,
    {keys: {SOURCE: {[channel]: {addresses: [fromAddress], pubKey: publicKey.toString('hex')}}}},
    {
      currency: tokenAddress,
      mapto: source,
      satoshis: '1000000',
      address: new TransferDestination({type: DEST_PKH, destinationBytes: recipientHash}),
      ...output,
    },
  );
  return {prepare, id, systemId, delegatorContract, tokenContract, getFeeData};
}

beforeEach(() => jest.clearAllMocks());

it.each([
  ['mapped send to an R address', VETH, false, {}, DEST_PKH, 1, ETH_BRIDGE_NAME, null],
  ['mapped send to an identity', 'DAI.vETH', true, {}, DEST_ID, 1, ETH_BRIDGE_NAME, null],
  ['reserve to Bridge', VETH, false, {convertto: ETH_BRIDGE_NAME}, DEST_PKH, 3, ETH_BRIDGE_NAME, null],
  ['Bridge to reserve', ETH_BRIDGE_NAME, true, {convertto: 'DAI.vETH'}, DEST_PKH, 515, 'DAI.vETH', null],
  ['ETH reserve to another reserve', VETH, false, {convertto: 'DAI.vETH', via: ETH_BRIDGE_NAME}, DEST_PKH, 1027, ETH_BRIDGE_NAME, 'DAI.vETH'],
  ['ERC20 reserve to another reserve', 'DAI.vETH', true, {convertto: VETH, via: ETH_BRIDGE_NAME}, DEST_PKH, 1027, ETH_BRIDGE_NAME, VETH],
])('preserves %s', async (_, source, erc20, output, type, flags, destination, secondReserve) => {
  const {prepare, id, tokenContract} = setup({source, erc20});
  const response = await prepare({...output, address: new TransferDestination({type, destinationBytes: recipientHash})});

  expect(response).toMatchObject({err: false, result: {validation: {valid: true}}});
  expect(response.result.transferparams[0]).toMatchObject({
    currencyvalue: {currency: asHex(id(source)), amount: '1000000'},
    flags,
    destcurrencyid: asHex(id(destination)),
    secondreserveid: secondReserve == null ? NULL_ETH_ADDRESS : asHex(id(secondReserve)),
    destination: {destinationtype: type.toNumber(), destinationaddress: `0x${recipientHash.toString('hex')}`},
  });
  if (erc20) expect(tokenContract.approve.estimateGas).toHaveBeenCalledTimes(1);
});

it.each([
  ['reserve to reserve via Bridge', {}, {convertto: 'DAI.vETH', via: ETH_BRIDGE_NAME}, 1027, ETH_BRIDGE_NAME, 'DAI.vETH'],
  ['Bridge to reserve directly', {source: ETH_BRIDGE_NAME, erc20: true}, {convertto: VETH}, 515, VETH, null],
])('preflights %s with an ETH gateway destination and refund address', async (_, options, output, flags, destinationCurrency, secondReserve) => {
  const {prepare, id, delegatorContract, tokenContract} = setup(options);
  const response = await prepare({
    ...output,
    address: new TransferDestination({type: DEST_ETH, destinationBytes: recipientHash}),
  });

  expect(response).toMatchObject({err: false, result: {validation: {valid: true}}});
  const [transfer] = response.result.transferparams;
  expect(transfer).toMatchObject({
    flags, destcurrencyid: asHex(id(destinationCurrency)),
    secondreserveid: secondReserve == null ? NULL_ETH_ADDRESS : asHex(id(secondReserve)),
  });
  const destination = new TransferDestination();
  destination.fromBuffer(Buffer.concat([
    Buffer.from([transfer.destination.destinationtype, recipientHash.length]),
    Buffer.from(transfer.destination.destinationaddress.slice(2), 'hex'),
  ]));
  expect(destination.destinationBytes).toEqual(recipientHash);
  expect(destination.gatewayID).toBe(id(VETH));
  expect(fromBase58Check(destination.gatewayCode).hash).toEqual(Buffer.alloc(20));
  expect(destination.fees.toString()).toBe('1000000');
  expect(destination.auxDests).toHaveLength(1);
  expect(destination.auxDests[0].getAddressString()).toBe(
    ECPair.fromPublicKeyBuffer(publicKey, networks.verus).getAddress(),
  );
  if (options.erc20) {
    expect(tokenContract.approve.estimateGas).toHaveBeenCalledTimes(1);
  } else {
    expect(delegatorContract.sendTransfer.staticCall).toHaveBeenCalledWith(
      transfer,
      expect.objectContaining({from: fromAddress}),
    );
  }
});

it.each([
  ['reserve target without via', {}, {convertto: 'DAI.vETH'}, 'Unsupported Ethereum bridge conversion'],
  ['wrong converter', {}, {convertto: 'DAI.vETH', via: 'Other'}, 'must use Bridge.vETH'],
  ['via without conversion', {}, {via: ETH_BRIDGE_NAME}, 'must use Bridge.vETH'],
  ['same reserve via Bridge', {}, {convertto: VETH, via: ETH_BRIDGE_NAME}, 'Unsupported Ethereum bridge conversion'],
  ['Bridge source with via', {source: ETH_BRIDGE_NAME, erc20: true}, {convertto: 'DAI.vETH', via: ETH_BRIDGE_NAME}, 'Unsupported Ethereum bridge conversion'],
  ['nonreserve source', {source: 'Other', erc20: true}, {convertto: ETH_BRIDGE_NAME}, 'Unsupported Ethereum bridge conversion'],
  ['nonreserve target', {source: ETH_BRIDGE_NAME, erc20: true}, {convertto: 'Other'}, 'Unsupported Ethereum bridge conversion'],
  ['another export system', {}, {convertto: ETH_BRIDGE_NAME, exportto: 'vARRR'}, 'only support exports'],
  ['preconversion', {}, {preconvert: true}, 'Preconversions'],
  ['burn', {}, {burn: true}, 'burns'],
  ['burn weight', {}, {burnweight: true}, 'burns'],
  ['mint', {}, {mintnew: true}, 'minting'],
  ['conversion before launch with mapto', {pastPrelaunch: false}, {convertto: ETH_BRIDGE_NAME}, 'pre-launch'],
])('rejects %s before gas or simulation', async (_, options, output, message) => {
  const {prepare, delegatorContract, tokenContract, getFeeData} = setup(options);
  const response = await prepare(output);

  expect(response).toEqual({err: true, result: expect.stringContaining(message)});
  expect(getFeeData).not.toHaveBeenCalled();
  expect(delegatorContract.sendTransfer.estimateGas).not.toHaveBeenCalled();
  expect(delegatorContract.sendTransfer.staticCall).not.toHaveBeenCalled();
  expect(tokenContract.approve.estimateGas).not.toHaveBeenCalled();
});

it.each(['VRSC', 'VRSCTEST'])('allows explicit export to the current %s system or its Bridge importer', async systemName => {
  const {prepare, id, systemId} = setup({systemName});
  for (const exportto of [systemName, systemId, ETH_BRIDGE_NAME, id(ETH_BRIDGE_NAME)]) {
    const response = await prepare({convertto: ETH_BRIDGE_NAME, exportto});
    expect(response.err).toBe(false);
    expect(response.result.transferparams[0]).toMatchObject({
      flags: 3, destcurrencyid: asHex(id(ETH_BRIDGE_NAME)), secondreserveid: NULL_ETH_ADDRESS,
    });
  }
});

it.each(['id', 'mixed case', 'root-qualified'])('accepts %s currency names without changing conversion semantics', async form => {
  const {prepare, id} = setup();
  const bridge = form === 'id' ? id(ETH_BRIDGE_NAME) : form === 'mixed case' ? 'bRiDgE.vEtH' : 'Bridge.vETH.VRSC@';
  const response = await prepare({mapto: id(VETH), convertto: id('DAI.vETH'), via: bridge});
  expect(response.err).toBe(false);
  expect(response.result.transferparams[0]).toMatchObject({
    flags: 1027, destcurrencyid: asHex(id(ETH_BRIDGE_NAME)), secondreserveid: asHex(id('DAI.vETH')),
  });
});

it.each([false, true])('retains contract token-list mapping when mapto is omitted (ERC20: %s)', async erc20 => {
  const source = erc20 ? 'DAI.vETH' : VETH;
  const {prepare, id, delegatorContract} = setup({source, erc20});
  const response = await prepare({mapto: undefined, convertto: ETH_BRIDGE_NAME});
  expect(response.err).toBe(false);
  expect(delegatorContract.getTokenList.staticCall).toHaveBeenCalledWith(0, 0);
  expect(response.result.transferparams[0]).toMatchObject({
    currencyvalue: {currency: asHex(id(source))}, flags: 3,
    destcurrencyid: asHex(id(ETH_BRIDGE_NAME)), secondreserveid: NULL_ETH_ADDRESS,
  });
});

it.each([
  ['a different ERC20', 'DAI.vETH', true, 'MKR.vETH', '0x9f8F72aA9304c8B593d555F12ef6589cC3A579A2'],
  ['an ERC20 when sending ETH', VETH, false, 'DAI.vETH', DAI_CONTRACT_ADDRESS],
  ['native ETH when sending an ERC20', 'DAI.vETH', true, VETH, ETH_CONTRACT_ADDRESS],
  ['an unregistered currency', 'DAI.vETH', true, 'Other', null],
])('rejects an explicit mapping to %s before gas or simulation', async (_, source, erc20, mapto, mappedToken) => {
  const {prepare, id, delegatorContract, tokenContract, getFeeData} = setup({source, erc20});
  const registered = await delegatorContract.getTokenList.staticCall();
  delegatorContract.getTokenList.staticCall.mockResolvedValue([
    ...registered,
    ...(mappedToken == null ? [] : [[asHex(id(mapto)), mappedToken, 0, 0]]),
  ]);

  const response = await prepare({mapto});

  expect(response).toEqual({err: true, result: expect.stringContaining('mapping does not match the currency being sent')});
  expect(getFeeData).not.toHaveBeenCalled();
  expect(delegatorContract.sendTransfer.estimateGas).not.toHaveBeenCalled();
  expect(delegatorContract.sendTransfer.staticCall).not.toHaveBeenCalled();
  expect(tokenContract.approve.estimateGas).not.toHaveBeenCalled();
});

it.each(['VRSC', 'VRSCTEST'])('allows an alternate explicit %s mapping to the same token contract', async systemName => {
  const {prepare, id, delegatorContract} = setup({source: 'DAI.vETH', erc20: true, systemName});
  delegatorContract.getTokenList.staticCall.mockResolvedValue([
    [asHex(id('DAI.vETH')), DAI_CONTRACT_ADDRESS, 0, 0],
    [asHex(id('Other')).toUpperCase(), DAI_CONTRACT_ADDRESS.toUpperCase(), 0, 0],
  ]);

  const response = await prepare({mapto: id('Other')});

  expect(response.err).toBe(false);
  expect(delegatorContract.getTokenList.staticCall).toHaveBeenCalledWith(0, 0);
  expect(response.result.transferparams[0].currencyvalue.currency).toBe(asHex(id('Other')));
  expect(response.result.validation.sent[DAI_CONTRACT_ADDRESS]).toBe('1000000');
});

it('retains mapped non-conversion transfers before launch', async () => {
  const {prepare, systemId} = setup({pastPrelaunch: false});
  const response = await prepare({});
  expect(response.err).toBe(false);
  expect(response.result.transferparams[0]).toMatchObject({
    flags: 1, destcurrencyid: asHex(systemId), secondreserveid: NULL_ETH_ADDRESS,
  });
});

it.each(['mapping', 'target', 'bridge ID', 'bridge reserves'])('rejects a substituted or invalid %s definition', async field => {
  const {prepare, id, getFeeData, delegatorContract, tokenContract} = setup();
  const lookup = getCurrency.getMockImplementation();
  getCurrency.mockImplementation(async (systemId, name) => {
    const response = await lookup(systemId, name);
    if ((field === 'mapping' && name === VETH) ||
      (field === 'target' && name === 'DAI.vETH') ||
      (field === 'bridge ID' && name === id(ETH_BRIDGE_NAME))) {
      response.result.currencyid = id('Other');
    } else if (field === 'bridge reserves' && name === id(ETH_BRIDGE_NAME)) {
      delete response.result.currencies;
    }
    return response;
  });

  const response = await prepare({convertto: 'DAI.vETH', via: ETH_BRIDGE_NAME});
  expect(response).toEqual({err: true, result: expect.stringMatching(/definition/)});
  expect(getFeeData).not.toHaveBeenCalled();
  expect(delegatorContract.sendTransfer.estimateGas).not.toHaveBeenCalled();
  expect(delegatorContract.sendTransfer.staticCall).not.toHaveBeenCalled();
  expect(tokenContract.approve.estimateGas).not.toHaveBeenCalled();
});
