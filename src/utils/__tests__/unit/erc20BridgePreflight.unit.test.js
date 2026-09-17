import BigNumber from 'bignumber.js';
import {ECPair, networks} from '@bitgo/utxo-lib';
import {
  DEST_ETH,
  TransferDestination,
  fromBase58Check,
  toIAddress,
} from 'verus-typescript-primitives';
import {preflightBridgeTransfer} from '../../api/channels/erc20/requests/preflight';
import {getWeb3ProviderForNetwork} from '../../web3/provider';
import {getCurrency} from '../../api/channels/verusid/callCreators';
import {getStandardEthBalance} from '../../api/channels/eth/callCreator';
import {ETH} from '../../constants/intervalConstants';
import {
  ETH_CONTRACT_ADDRESS,
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
  getSystemNameFromSystemId: () => 'VRSC',
}));
jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: jest.fn()},
}));

it('preflights an ETH conversion with a gateway destination and refund address', async () => {
  const systemId = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
  const fromAddress = '0x1111111111111111111111111111111111111111';
  const publicKey = Buffer.from(
    '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    'hex',
  );
  const recipientHash = Buffer.alloc(20, 2);
  const delegatorContract = {
    getAddress: jest.fn(async () => '0x3333333333333333333333333333333333333333'),
    bridgeConverterActive: {staticCall: jest.fn(async () => true)},
    sendTransfer: {
      estimateGas: jest.fn(async () => BigInt(100000)),
      staticCall: jest.fn(async () => true),
    },
  };
  delegatorContract.connect = jest.fn(() => delegatorContract);
  getWeb3ProviderForNetwork.mockReturnValue({
    network: 'mainnet',
    InfuraProvider: {
      getFeeData: jest.fn(async () => ({maxFeePerGas: BigInt(1000000000)})),
    },
    getVerusBridgeDelegatorContract: () => delegatorContract,
    getVrscSystem: () => systemId,
  });
  getCurrency.mockImplementation(async (_, name) => ({
    result: {currencyid: toIAddress(name, 'VRSC'), fullyqualifiedname: name},
  }));
  getStandardEthBalance.mockResolvedValue(BigNumber(10));

  const response = await preflightBridgeTransfer(
    {id: 'ETH', proto: 'eth', currency_id: ETH_CONTRACT_ADDRESS, network: 'mainnet'},
    ETH,
    {keys: {ETH: {[ETH]: {addresses: [fromAddress], pubKey: publicKey.toString('hex')}}}},
    {
      currency: ETH_CONTRACT_ADDRESS,
      mapto: VETH,
      convertto: 'DAI.vETH',
      satoshis: '1000000',
      address: new TransferDestination({type: DEST_ETH, destinationBytes: recipientHash}),
    },
  );

  expect(response).toMatchObject({err: false, result: {validation: {valid: true}}});
  const [transfer] = response.result.transferparams;
  const destination = new TransferDestination();
  destination.fromBuffer(Buffer.concat([
    Buffer.from([transfer.destination.destinationtype, recipientHash.length]),
    Buffer.from(transfer.destination.destinationaddress.slice(2), 'hex'),
  ]));
  expect(destination.destinationBytes).toEqual(recipientHash);
  expect(destination.gatewayID).toBe(toIAddress(VETH, 'VRSC'));
  expect(fromBase58Check(destination.gatewayCode).hash).toEqual(Buffer.alloc(20));
  expect(destination.fees.toString()).toBe('1000000');
  expect(destination.auxDests).toHaveLength(1);
  expect(destination.auxDests[0].getAddressString()).toBe(
    ECPair.fromPublicKeyBuffer(publicKey, networks.verus).getAddress(),
  );
  expect(delegatorContract.sendTransfer.staticCall).toHaveBeenCalledWith(
    transfer,
    expect.objectContaining({from: fromAddress}),
  );
});
