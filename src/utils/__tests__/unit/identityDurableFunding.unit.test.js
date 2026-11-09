const mockGetInfo = jest.fn();
const mockGetTransaction = jest.fn();
const mockGetBlock = jest.fn();
const mockSendRawTransaction = jest.fn();
const mockVerify = jest.fn();
const mockAssertCurrent = jest.fn();
const mockActiveHeight = jest.fn();
jest.mock('verusid-ts-client', () => ({
  verifyIdentityUpdateFunding: mockVerify,
}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getInfo: mockGetInfo,
  getTransaction: mockGetTransaction,
  getBlock: mockGetBlock,
  sendRawTransaction: mockSendRawTransaction,
}));
jest.mock('../../identityUpdate/verifiedSubmission', () => ({
  assertIdentityUpdateContext: mockAssertCurrent,
  getIdentityUpdateLockContext: mockActiveHeight,
}));
jest.mock('../../../../env/index', () => ({REQUEST_TIMEOUT_MS: 1000}));

const {TransactionBuilder, Transaction, networks, ECPair, address} = require('@bitgo/utxo-lib');
const {
  broadcastPendingTransactions,
  loadMatchingPendingBroadcast,
  verifyPendingIdentityFundingAtActiveHeight,
  resolveIdentityUpdateLockContext,
} = require('../../spendableKey/durableBroadcast');
const transaction = {
  type: 'identity',
  systemId: 'selected-chain',
  txHex: 'reviewed-bytes',
  inputs: [],
  fundingApproval: {systemId: 'selected-chain'},
  lockContext: {chainId: 'selected-chain', nextBlockHeight: 12},
};

beforeEach(() => jest.resetAllMocks());

it('verifies gift-card/claim approvals with independently read active height', async () => {
  mockGetInfo.mockResolvedValue({
    result: {chainid: 'selected-chain', blocks: 100, longestchain: 900},
  });
  await expect(
    verifyPendingIdentityFundingAtActiveHeight(transaction),
  ).resolves.toEqual({
    chainId: 'selected-chain',
    nextBlockHeight: 101,
  });
  expect(mockVerify).toHaveBeenCalledWith(
    transaction.fundingApproval,
    'reviewed-bytes',
    [],
    {
      chainId: 'selected-chain',
      nextBlockHeight: 101,
    },
  );
});

const signedSavedTransaction = (inputMarker = 9) => {
  const key = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 7), networks.verus);
  const builder = new TransactionBuilder(networks.verus);
  builder.setVersion(4);
  builder.setVersionGroupId(0x892f2085);
  builder.setExpiryHeight(150);
  builder.addInput(Buffer.alloc(32, inputMarker), 0, undefined,
    address.toOutputScript(key.getAddress(), networks.verus));
  builder.addOutput(key.getAddress(), 10000);
  builder.sign(0, key, null, Transaction.SIGHASH_ALL, 20000);
  const signed = builder.build();
  return {
    type: 'identity',
    systemId: 'selected-chain',
    rawTx: signed.toHex(),
    txid: signed.getId(),
    status: 'prepared',
    inputs: [],
  };
};

const savedBatch = () => ({
  id: 'saved-identity-batch',
  kind: 'spendable-key-claim',
  transactions: [signedSavedTransaction()],
});

describe('submission handoff without delivery acknowledgement', () => {
  let pendingBroadcast;
  let persist;
  const send = (options = {}) => broadcastPendingTransactions({
    pendingBroadcast,
    persistPendingBroadcast: persist,
    assertCurrent: mockAssertCurrent,
    requestTimeoutMs: 5,
    ...options,
  });

  beforeEach(() => {
    pendingBroadcast = savedBatch();
    pendingBroadcast.transactions[0].type = 'sweep';
    persist = jest.fn(async () => {});
    mockSendRawTransaction.mockResolvedValue({result: pendingBroadcast.transactions[0].txid});
  });

  it.each(['timeout', 'rejected promise', 'null rejection', 'synchronous error', 'RPC error', 'wrong transaction ID', 'missing response', 'missing transaction ID', 'malformed transaction ID'])(
    'marks %s as submitted without adding an acknowledged result', async outcome => {
      if (outcome === 'timeout') mockSendRawTransaction.mockReturnValueOnce(new Promise(() => {}));
      else if (outcome === 'rejected promise') mockSendRawTransaction.mockRejectedValueOnce(new Error('Connection closed'));
      else if (outcome === 'null rejection') mockSendRawTransaction.mockRejectedValueOnce(null);
      else if (outcome === 'synchronous error') mockSendRawTransaction.mockImplementationOnce(() => {throw new Error('Transport failed');});
      else if (outcome === 'RPC error') mockSendRawTransaction.mockResolvedValueOnce({error: {message: 'Rejected'}});
      else if (outcome === 'missing response') mockSendRawTransaction.mockResolvedValueOnce(null);
      else if (outcome === 'missing transaction ID') mockSendRawTransaction.mockResolvedValueOnce({});
      else if (outcome === 'malformed transaction ID') mockSendRawTransaction.mockResolvedValueOnce({result: {txid: 'ab'.repeat(32)}});
      else mockSendRawTransaction.mockResolvedValueOnce({result: 'ab'.repeat(32)});

      const error = await send().catch(value => value);
      const transaction = pendingBroadcast.transactions[0];
      expect(error).toMatchObject({code: 'BROADCAST_UNKNOWN', submitted: true, txid: transaction.txid, results: []});
      expect(error.pendingBroadcast.transactions[0]).toMatchObject({
        rawTx: transaction.rawTx, txid: transaction.txid, status: 'prepared', broadcastAttempted: true,
      });
      expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves SESSION_CHANGED after handoff without acknowledging the transaction', async () => {
    mockSendRawTransaction.mockImplementationOnce(async () => {
      mockAssertCurrent.mockImplementation(() => {throw Object.assign(new Error('Account changed'), {code: 'SESSION_CHANGED'});});
      return {result: pendingBroadcast.transactions[0].txid};
    });
    await expect(send()).rejects.toMatchObject({
      code: 'SESSION_CHANGED', submitted: true, txid: pendingBroadcast.transactions[0].txid, results: [],
    });
    expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
  });

  it('does not mark a failed final validation as submitted after saving the attempt marker', async () => {
    const beforeSend = jest.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Review changed'));
    const error = await send({beforeSend}).catch(value => value);
    expect(error.message).toBe('Review changed');
    expect(error).not.toHaveProperty('submitted');
    expect(persist.mock.calls[1][0].transactions[0].broadcastAttempted).toBe(true);
    expect(mockSendRawTransaction).not.toHaveBeenCalled();
  });

  it('retains handoff and the accepted result when saving acknowledgement fails', async () => {
    persist.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Storage unavailable'));
    const error = await send().catch(value => value);
    const txid = pendingBroadcast.transactions[0].txid;
    expect(error).toMatchObject({submitted: true, txid, results: [{txid, status: 'submitted'}]});
    expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('authoritative saved transaction lookup', () => {
  it('returns stored approval and status instead of caller-supplied metadata', async () => {
    const stored = savedBatch();
    stored.transactions[0].fundingApproval = {systemId: 'selected-chain', nativeFee: '10000'};
    stored.transactions[0].status = 'submitted';
    const caller = JSON.parse(JSON.stringify(stored));
    delete caller.transactions[0].fundingApproval;
    caller.transactions[0].status = 'prepared';
    const load = jest.fn(async () => stored);

    await expect(loadMatchingPendingBroadcast(caller, load)).resolves.toBe(stored);
    expect(load).toHaveBeenCalledWith(stored.id);
  });

  it.each(['id', 'kind', 'type', 'network', 'txid', 'bytes', 'order', 'count'])(
    'rejects a caller changing the saved transaction %s', async field => {
      const stored = savedBatch();
      stored.transactions.push(signedSavedTransaction(10));
      const caller = JSON.parse(JSON.stringify(stored));
      if (field === 'id') caller.id = 'different-batch';
      else if (field === 'kind') caller.kind = 'different-kind';
      else if (field === 'type') caller.transactions[0].type = 'funds';
      else if (field === 'network') caller.transactions[0].systemId = 'other-chain';
      else if (field === 'txid') caller.transactions[0].txid = '00'.repeat(32);
      else if (field === 'bytes') caller.transactions[0].rawTx = caller.transactions[1].rawTx;
      else if (field === 'order') caller.transactions.reverse();
      else caller.transactions.pop();

      await expect(loadMatchingPendingBroadcast(caller, async () => stored)).rejects.toThrow();
    },
  );

  it.each([undefined, null, {}, {transactions: []}])(
    'rejects unavailable or incomplete stored records (%p)', async stored => {
      await expect(loadMatchingPendingBroadcast(savedBatch(), async () => stored)).rejects.toThrow();
    },
  );

  it('requires a loader rather than accepting caller bytes as saved evidence', async () => {
    await expect(loadMatchingPendingBroadcast(savedBatch())).rejects.toThrow();
  });
});

describe('resuming signed identity transactions saved before funding approvals', () => {
  let pendingBroadcast;
  let persist;
  const context = {systemId: 'selected-chain', sessionScope: {accountHash: 'original-wallet'}};
  const resume = (options = {}) => broadcastPendingTransactions({
    pendingBroadcast,
    persistPendingBroadcast: persist,
    identityContext: context,
    resumeSavedTransactions: true,
    ...options,
  });

  beforeEach(() => {
    pendingBroadcast = savedBatch();
    persist = jest.fn(async () => {});
    mockActiveHeight.mockResolvedValue({chainId: 'selected-chain', nextBlockHeight: 101});
    mockGetTransaction.mockResolvedValue({error: {code: -5, message: 'Not found'}});
    mockSendRawTransaction.mockImplementation(async (_chain, rawTx) => ({
      result: Transaction.fromHex(rawTx, networks.verus).getId(),
    }));
  });

  it.each([101, 501])('reconciles exact saved bytes at height %i without a saved broadcastAttempted flag', async nextBlockHeight => {
    const saved = pendingBroadcast.transactions[0];
    expect(saved).not.toHaveProperty('fundingApproval');
    expect(saved).not.toHaveProperty('broadcastAttempted');
    expect(Transaction.fromHex(saved.rawTx, networks.verus).ins[0].script.length).toBeGreaterThan(0);
    mockActiveHeight.mockResolvedValue({chainId: saved.systemId, nextBlockHeight});
    mockGetTransaction.mockResolvedValue({result: saved.rawTx});

    const result = await resume();
    expect(result.results).toEqual([expect.objectContaining({txid: saved.txid, rawTx: saved.rawTx, status: 'submitted'})]);
    expect(mockGetTransaction).toHaveBeenCalledWith(saved.systemId, saved.txid, 0);
    expect(mockSendRawTransaction).not.toHaveBeenCalled();
    expect(mockVerify).not.toHaveBeenCalled();
    expect(persist).toHaveBeenLastCalledWith(expect.objectContaining({
      transactions: [expect.objectContaining({txid: saved.txid, status: 'submitted'})],
    }));
  });

  it('submits only the exact unexpired saved bytes after the network reports absence', async () => {
    const saved = pendingBroadcast.transactions[0];
    const result = await resume();

    expect(mockGetTransaction).toHaveBeenCalledWith(saved.systemId, saved.txid, 0);
    expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
    expect(mockSendRawTransaction).toHaveBeenCalledWith(saved.systemId, saved.rawTx);
    expect(mockGetTransaction.mock.invocationCallOrder[0]).toBeLessThan(mockSendRawTransaction.mock.invocationCallOrder[0]);
    expect(mockActiveHeight).toHaveBeenCalledWith(context);
    expect(result.results[0]).toMatchObject({txid: saved.txid, rawTx: saved.rawTx, status: 'submitted'});
  });

  it('rejects an absent expired transaction instead of rebuilding or resending it', async () => {
    mockActiveHeight.mockResolvedValue({chainId: 'selected-chain', nextBlockHeight: 150});
    await expect(resume()).rejects.toThrow(/expired/i);
    expect(mockGetTransaction).toHaveBeenCalled();
    expect(mockSendRawTransaction).not.toHaveBeenCalled();
  });

  it.each(['missing bytes', 'unsigned input', 'no inputs', 'changed bytes'])(
    'rejects %s before any broadcast', async mutation => {
      const saved = pendingBroadcast.transactions[0];
      if (mutation === 'missing bytes') delete saved.rawTx;
      else {
        const tx = Transaction.fromHex(saved.rawTx, networks.verus);
        if (mutation === 'unsigned input') tx.ins[0].script = Buffer.alloc(0);
        else if (mutation === 'no inputs') tx.ins = [];
        else tx.outs[0].value -= 1;
        saved.rawTx = tx.toHex();
        // These retain a matching txid, so unsigned-input checks must do the rejection.
        if (mutation !== 'changed bytes') saved.txid = tx.getId();
      }

      await expect(resume()).rejects.toThrow();
      expect(mockSendRawTransaction).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, false])('does not permit missing approvals with resumeSavedTransactions=%p', async resumeSavedTransactions => {
    await expect(resume({resumeSavedTransactions})).rejects.toThrow(/funding approval/i);
    expect(mockSendRawTransaction).not.toHaveBeenCalled();
  });

  it('still verifies an approval retained in the saved record', async () => {
    const saved = pendingBroadcast.transactions[0];
    saved.fundingApproval = {systemId: saved.systemId, nativeFee: '10000'};
    await resume();
    expect(mockVerify).toHaveBeenCalledWith(saved.fundingApproval, saved.rawTx, saved.inputs,
      {chainId: saved.systemId, nextBlockHeight: 101});
    expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a saved approval that fails verification instead of falling back to old-record handling', async () => {
    pendingBroadcast.transactions[0].fundingApproval = {systemId: 'selected-chain'};
    mockVerify.mockImplementation(() => {throw new Error('Saved approval does not match transaction');});
    await expect(resume()).rejects.toThrow('Saved approval does not match transaction');
    expect(mockSendRawTransaction).not.toHaveBeenCalled();
  });

  it('stops when the active network cannot be independently verified', async () => {
    mockActiveHeight.mockRejectedValue(new Error('Unable to verify the identity update network and height.'));
    await expect(resume()).rejects.toThrow('network and height');
    expect(mockSendRawTransaction).not.toHaveBeenCalled();
  });
});

it.each([
  {chainid: 'other-chain', blocks: 100},
  {chainid: 'selected-chain', longestchain: 100},
  {chainid: 'selected-chain', blocks: '100'},
  {chainid: 'selected-chain', blocks: -1},
  {chainid: 'selected-chain', blocks: 1.5},
  {chainid: 'selected-chain', blocks: 499999999},
])(
  'rejects untrusted height data before approval verification: %j',
  async result => {
    mockGetInfo.mockResolvedValue({result});
    await expect(
      verifyPendingIdentityFundingAtActiveHeight(transaction),
    ).rejects.toThrow('network and height');
    expect(mockVerify).not.toHaveBeenCalled();
  },
);

const savedTransaction = () => {
  const builder = new TransactionBuilder(networks.verus);
  builder.setVersion(4);
  builder.setVersionGroupId(0x892f2085);
  builder.setExpiryHeight(150);
  builder.addInput(Buffer.alloc(32, 9), 0);
  builder.addOutput(Buffer.from([0x51]), 10000);
  const tx = builder.buildIncomplete();
  return {
    systemId: 'selected-chain',
    hex: tx.toHex(),
    signedHex: tx.toHex(),
    txid: tx.getId(),
    status: 'submitted',
  };
};

describe('historical verification retained for gift and claim transactions', () => {
  const context = {systemId: 'selected-chain'};
  const blockhash = 'ab'.repeat(32);
  let receipt;

  beforeEach(() => {
    receipt = savedTransaction();
    mockActiveHeight.mockResolvedValue({
      chainId: 'selected-chain',
      nextBlockHeight: 501,
    });
    mockGetTransaction.mockResolvedValue({
      result: {
        hex: receipt.signedHex,
        txid: receipt.txid,
        blockhash,
        confirmations: 400,
        height: 1,
      },
    });
    mockGetBlock.mockResolvedValue({
      result: {
        hash: blockhash,
        height: 101,
        confirmations: 400,
        tx: [receipt.txid],
      },
    });
  });

  it('uses independently verified active-block inclusion after expiry', async () => {
    receipt.metadata = {
      lockContext: {chainId: 'selected-chain', nextBlockHeight: 999},
    };
    await expect(
      resolveIdentityUpdateLockContext(context, receipt),
    ).resolves.toEqual({
      chainId: 'selected-chain',
      nextBlockHeight: 101,
    });
    expect(mockGetTransaction).toHaveBeenCalledWith(
      'selected-chain',
      receipt.txid,
      1,
    );
    expect(mockGetBlock).toHaveBeenNthCalledWith(
      1,
      'selected-chain',
      blockhash,
      1,
    );
    expect(mockGetBlock).toHaveBeenNthCalledWith(2, 'selected-chain', '101', 1);
  });

  it('uses the active height for an unexpired prepared transaction', async () => {
    receipt.status = 'prepared';
    mockActiveHeight.mockResolvedValue({
      chainId: 'selected-chain',
      nextBlockHeight: 101,
    });
    await expect(
      resolveIdentityUpdateLockContext(context, receipt),
    ).resolves.toEqual({
      chainId: 'selected-chain',
      nextBlockHeight: 101,
    });
    expect(mockGetTransaction).not.toHaveBeenCalled();
  });

  it('uses the active height for exact unexpired mempool bytes', async () => {
    mockActiveHeight.mockResolvedValue({
      chainId: 'selected-chain',
      nextBlockHeight: 101,
    });
    mockGetTransaction.mockResolvedValue({
      result: {hex: receipt.signedHex, confirmations: 0},
    });
    await expect(
      resolveIdentityUpdateLockContext(context, receipt),
    ).resolves.toEqual({
      chainId: 'selected-chain',
      nextBlockHeight: 101,
    });
    expect(mockGetBlock).not.toHaveBeenCalled();
  });

  it('does not invent historical height when an expired transaction is absent', async () => {
    mockGetTransaction.mockResolvedValue({
      error: {code: -5, message: 'Not found'},
    });
    await expect(
      resolveIdentityUpdateLockContext(context, receipt),
    ).resolves.toBeUndefined();
    expect(mockGetBlock).not.toHaveBeenCalled();
  });

  it.each([
    'membership',
    'reorg',
    'wrong bytes',
    'missing block',
    'future block',
  ])('rejects invalid %s evidence', async mutation => {
    if (mutation === 'membership') {
      mockGetBlock.mockResolvedValue({
        result: {hash: blockhash, height: 101, confirmations: 400, tx: []},
      });
    } else if (mutation === 'reorg') {
      mockGetBlock
        .mockResolvedValueOnce({
          result: {
            hash: blockhash,
            height: 101,
            confirmations: 400,
            tx: [receipt.txid],
          },
        })
        .mockResolvedValueOnce({
          result: {hash: 'cd'.repeat(32), height: 101, confirmations: 400},
        });
    } else if (mutation === 'wrong bytes') {
      mockGetTransaction.mockResolvedValue({
        result: {hex: '00', txid: receipt.txid, blockhash, confirmations: 400},
      });
    } else if (mutation === 'missing block') {
      mockGetTransaction.mockResolvedValue({result: receipt.signedHex});
    } else {
      mockGetBlock.mockResolvedValue({
        result: {
          hash: blockhash,
          height: 501,
          confirmations: 1,
          tx: [receipt.txid],
        },
      });
    }
    await expect(
      resolveIdentityUpdateLockContext(context, receipt),
    ).rejects.toThrow();
  });

  it('rejects another network before reading height or transactions', async () => {
    await expect(
      resolveIdentityUpdateLockContext({systemId: 'other-chain'}, receipt),
    ).rejects.toThrow('different network');
    expect(mockActiveHeight).not.toHaveBeenCalled();
    expect(mockGetTransaction).not.toHaveBeenCalled();
  });

  it('stops historical reads if the originating session changes', async () => {
    mockGetTransaction.mockImplementation(async () => {
      mockAssertCurrent.mockImplementation(() => {
        throw Object.assign(new Error('Account changed'), {
          code: 'SESSION_CHANGED',
        });
      });
      return {
        result: {
          hex: receipt.signedHex,
          txid: receipt.txid,
          blockhash,
          confirmations: 400,
        },
      };
    });
    await expect(
      resolveIdentityUpdateLockContext(context, receipt),
    ).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockGetBlock).not.toHaveBeenCalled();
  });
});
