import {getSignedRequestDisplayProps} from '../../deeplink/handlers/requestDisplayUtils';
import {CoinDirectory} from '../../CoinData/CoinDirectory';
import {getIdentity} from '../../api/channels/verusid/callCreators';
import {getSignatureInfo} from '../../api/channels/vrpc/requests/getSignatureInfo';
import {getBlock} from '../../api/channels/vrpc/requests/getBlock';
import VrpcProvider from '../../vrpc/vrpcInterface';

jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {getBasicCoinObj: jest.fn()}}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getSignatureInfo', () => ({getSignatureInfo: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getBlock', () => ({getBlock: jest.fn()}));
jest.mock('../../fullyqualifiedname', () => ({convertFqnToDisplayFormat: value => value}));
jest.mock('../../vrpc/vrpcInterface', () => ({__esModule: true, default: {initEndpoint: jest.fn()}}));

beforeEach(() => {
  jest.clearAllMocks();
  getIdentity.mockResolvedValue({result: {fullyqualifiedname: 'requester@'}});
  getSignatureInfo.mockResolvedValue({height: 100});
  getBlock.mockResolvedValue({result: {time: 12345}});
});

it.each([
  ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV', 'VRSC', 'VRSC'],
  ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq', 'VRSCTEST', 'VRSCTEST'],
  ['iPBaaSChain', 'Other Chain', 'Other Chain'],
  ['iPBaaSChain', undefined, 'iPBaaSChain'],
])('loads signer metadata using system %s and displays %s', async (systemID, ticker, name) => {
  const request = {signature: {
    systemID: {toIAddress: () => systemID},
    identityID: {toIAddress: () => 'iRequester'},
    signatureAsVch: Buffer.from('signature'),
  }};
  CoinDirectory.getBasicCoinObj.mockReturnValue({
    system_id: systemID, display_ticker: ticker, vrpc_endpoints: ['https://example.com'],
  });

  await expect(getSignedRequestDisplayProps(request)).resolves.toEqual({
    signerSystemID: systemID, signerSystemName: name, signerIdentityID: 'iRequester',
    signerFqn: 'requester@', sigtime: 12345,
  });
  expect(CoinDirectory.getBasicCoinObj).toHaveBeenCalledWith(systemID);
  expect(VrpcProvider.initEndpoint).toHaveBeenCalledWith(systemID, 'https://example.com');
  expect(getIdentity).toHaveBeenCalledWith(systemID, 'iRequester');
  expect(getSignatureInfo).toHaveBeenCalledWith(systemID, 'iRequester', Buffer.from('signature').toString('base64'));
  expect(getBlock).toHaveBeenCalledWith(systemID, 100);
});
