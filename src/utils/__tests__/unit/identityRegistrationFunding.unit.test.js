const mockGetUtxos = jest.fn();
jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    getEndpoint: () => ({getAddressUtxos: mockGetUtxos}),
  },
}));

const {
  getIdentityRegistrationFunding,
  registrationRpcResult,
} = require('../../api/channels/verusid/requests/registerIdentity');

beforeEach(() => jest.clearAllMocks());

test('selects native and token funding, excludes zero-value commitments, and forwards only outpoints', async () => {
  const txid = 'a'.repeat(64);
  mockGetUtxos.mockResolvedValue({result: [
    {txid, outputIndex: 0, isspendable: true, satoshis: 10000, script: 'untrusted'},
    {txid, outputIndex: 1, isspendable: true, satoshis: 0, currencyvalues: {'token-id': '10'}, script: 'untrusted-token'},
    {txid, outputIndex: 2, isspendable: true, satoshis: 0},
    {txid, outputIndex: 3, isspendable: false, satoshis: 20000},
    {txid, outputIndex: 4, isspendable: 1, satoshis: 30000},
    {txid, outputIndex: 5, isspendable: 0, satoshis: 30000},
    {txid, outputIndex: 6, isspendable: '1', satoshis: 30000},
  ]});
  expect(await getIdentityRegistrationFunding('system', 'R-wallet')).toEqual([{txid, vout: 0}, {txid, vout: 1}, {txid, vout: 4}]);
  expect(mockGetUtxos).toHaveBeenCalledWith({addresses: ['R-wallet']});
});

test('rejects invalid and duplicate index outpoints', async () => {
  const output = {txid: 'a'.repeat(64), outputIndex: 0, isspendable: true, satoshis: 10000};
  mockGetUtxos.mockResolvedValueOnce({result: [output, {...output}]});
  await expect(getIdentityRegistrationFunding('system', 'R-wallet')).rejects.toThrow(/Duplicate/);
  mockGetUtxos.mockResolvedValueOnce({result: [{...output, outputIndex: 4294967296}]});
  await expect(getIdentityRegistrationFunding('system', 'R-wallet')).rejects.toThrow(/Invalid/);
});

test('RPC failure is never an empty funding result', async () => {
  mockGetUtxos.mockResolvedValue({error: {code: -28, message: 'Index loading'}});
  await expect(getIdentityRegistrationFunding('system', 'R-wallet')).rejects.toMatchObject({code: -28});
  expect(() => registrationRpcResult({}, 'query')).toThrow(/invalid response/);
});

