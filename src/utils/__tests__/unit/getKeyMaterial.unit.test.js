import { SaplingExtendedSpendingKey } from 'verus-typescript-primitives';
import { toBech32 } from 'verus-typescript-primitives/dist/utils/sapling';
import { requestPrivKey } from '../../auth/authBox';
import { getKeyMaterial, spendingKeyHex } from '../../crypto/getKeyMaterial';
import { DLIGHT_PRIVATE } from '../../constants/intervalConstants';

let mockAuthentication;

jest.mock('../../../store', () => ({
  __esModule: true,
  default: { getState: () => ({ authentication: mockAuthentication }) },
}));
jest.mock('../../auth/authBox', () => ({ requestPrivKey: jest.fn() }));
jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: { getBasicCoinObj: () => ({ id: 'VRSC' }) },
}));

// Synthetic encoding fixture only; not a usable wallet or native derivation seed.
const bytes = Buffer.from(Array.from({ length: 169 }, (_, index) => index));
const key = new SaplingExtendedSpendingKey();
key.fromBuffer(bytes);

describe('Sapling key normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthentication = {
      activeAccount: { keys: { VRSC: { [DLIGHT_PRIVATE]: {} } } },
      sessionKey: 'session-key',
    };
  });

  it.each([false, true])('decodes the complete Bech32 key (testnet = %s)', testnet => {
    expect(spendingKeyHex(key.toKeyString(testnet))).toBe(bytes.toString('hex'));
  });

  it('accepts exact raw native hex and normalizes its case', () => {
    expect(spendingKeyHex(bytes.toString('hex').toUpperCase())).toBe(bytes.toString('hex'));
  });

  it.each([
    null,
    '',
    'ab'.repeat(168),
    'ab'.repeat(170),
    toBech32('zxviews', bytes),
    toBech32('secret-extended-key-main', bytes.slice(1)),
    toBech32('secret-extended-key-other', bytes),
    `${key.toKeyString().slice(0, -1)}!`,
  ])('rejects malformed key %s without echoing it', value => {
    expect(() => spendingKeyHex(value)).toThrow(/^Invalid Sapling extended spending key\.$/);
  });

  it('binds key access to the supplied request context', async () => {
    const context = { sessionScope: { accountHash: 'account-a', sessionEpoch: 2 } };
    requestPrivKey.mockResolvedValueOnce(key.toKeyString());

    await expect(getKeyMaterial('VRSC', context)).resolves.toEqual({ extsk: bytes.toString('hex') });
    expect(requestPrivKey).toHaveBeenCalledWith('VRSC', DLIGHT_PRIVATE, context);
  });

  it.each(['SESSION_CHANGED', 'AUTH_FAILED'])('preserves %s errors', async code => {
    const error = Object.assign(new Error('Private key access failed'), { code });
    requestPrivKey.mockRejectedValueOnce(error);

    await expect(getKeyMaterial('VRSC')).rejects.toBe(error);
  });

  it('reports a missing key with setup guidance', async () => {
    requestPrivKey.mockResolvedValueOnce(null);

    await expect(getKeyMaterial('VRSC')).rejects.toThrow('set up a Z Seed');
  });

  it('reports a missing shielded-key record with setup guidance', async () => {
    mockAuthentication.activeAccount.keys = {};

    await expect(getKeyMaterial('VRSC')).rejects.toThrow('set up a Z Seed');
    expect(requestPrivKey).not.toHaveBeenCalled();
  });
});
