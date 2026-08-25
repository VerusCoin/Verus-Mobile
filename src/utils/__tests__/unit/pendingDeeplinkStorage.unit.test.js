const mockStorage = new Map();

jest.mock('../../keychain/secureStore', () => ({
  SecureStorage: {
    getItem: jest.fn(async key => mockStorage.get(key) || null),
    setItem: jest.fn(async (key, value) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async key => {
      mockStorage.delete(key);
    }),
  },
}));

const {
  GenericRequest,
  SpendableKeyDetails,
  SpendableKeyDetailsOrdinalVDXFObject,
} = require('verus-typescript-primitives');
const {getMnemonicEntropyBuffer} = require('../../walletBackup/walletBackup');
const {
  getPendingDeeplinkRequest,
  loadPendingDeeplinkRequests,
  markPendingDeeplinkComplete,
  savePendingDeeplinkRequest,
  setPendingDeeplinkBroadcast,
} = require('../../deeplink/pendingDeeplinkStorage');

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

const makeSpendableRequestBuffer = marker => {
  const detail = new SpendableKeyDetailsOrdinalVDXFObject({
    data: new SpendableKeyDetails({
      data: Buffer.concat([
        getMnemonicEntropyBuffer(MNEMONIC).subarray(0, 31),
        Buffer.from([marker]),
      ]),
      seedFormat: SpendableKeyDetails.SEED_FORMAT_BIP39,
      encryptionFormat: SpendableKeyDetails.ENCRYPTION_FORMAT_NONE,
    }),
  });

  return new GenericRequest({details: [detail]}).toBuffer().toString('hex');
};

describe('pending deeplink durable broadcast storage', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('keeps concurrent request updates instead of losing the last writer', async () => {
    const firstBuffer = makeSpendableRequestBuffer(1);
    const secondBuffer = makeSpendableRequestBuffer(2);
    const [first] = await Promise.all([
      savePendingDeeplinkRequest({requestBufferString: firstBuffer}),
      savePendingDeeplinkRequest({requestBufferString: secondBuffer}),
    ]);

    await markPendingDeeplinkComplete(first.id);

    const saved = await loadPendingDeeplinkRequests();
    expect(saved).toHaveLength(2);
    expect(saved.find(request => request.id === first.id)?.completed).toBe(true);
  });

  it('persists and preserves a signed pending broadcast when request metadata is refreshed', async () => {
    const requestBufferString = makeSpendableRequestBuffer(3);
    const saved = await savePendingDeeplinkRequest({requestBufferString});
    const pendingBroadcast = {
      id: 'broadcast-id',
      kind: 'spendable-key-claim',
      transactions: [
        {
          systemId: 'system-id',
          txid: '11'.repeat(32),
          rawTx: 'signed-raw-transaction',
          status: 'prepared',
        },
      ],
    };

    await setPendingDeeplinkBroadcast(saved.id, pendingBroadcast);
    await savePendingDeeplinkRequest({
      requestBufferString,
      uri: 'verus://updated',
    });

    await expect(getPendingDeeplinkRequest(saved.id)).resolves.toEqual(
      expect.objectContaining({pendingBroadcast}),
    );
  });

  it('refuses to persist a broadcast for an unknown request', async () => {
    await expect(
      setPendingDeeplinkBroadcast('missing', {
        id: 'broadcast-id',
        transactions: [],
      }),
    ).rejects.toThrow('unknown pending request');
  });
});
