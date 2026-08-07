const mockRootCoin = {
  id: 'VRSC',
  display_ticker: 'VRSC',
  currency_id: 'root-system',
  system_id: 'root-system',
  testnet: false,
  vrpc_endpoints: ['root-endpoint'],
  compatible_channels: ['vrpc'],
  tags: ['is_pbaas'],
};
const mockTestCoin = {
  id: 'VRSCTEST',
  display_ticker: 'VRSCTEST',
  currency_id: 'test-system',
  system_id: 'test-system',
  testnet: true,
  vrpc_endpoints: ['test-endpoint'],
  compatible_channels: ['vrpc'],
  tags: ['is_pbaas'],
};
const mockDeriveKeyPair = jest.fn();
const mockRandomBytes = jest.fn();
const mockInitEndpoint = jest.fn();
const mockGetEndpoint = jest.fn(() => ({
  getIdentitiesWithAddress: jest.fn().mockResolvedValue({result: []}),
}));
const mockGetBlock = jest.fn();
const mockGetBlockHash = jest.fn();
const mockGetAddressUtxos = jest.fn();
const mockGetAddressDeltas = jest.fn();
const mockGetIdentity = jest.fn();
const mockFundRawTransaction = jest.fn();
const mockGetInfo = jest.fn();
const mockGetSpendableUtxos = jest.fn();
const mockGetTransaction = jest.fn();
const mockSendRawTransaction = jest.fn();
const mockCreateUpdateIdentityTxWithUtxos = jest.fn();
const mockCreateUpdateIdentityWithCurrencyTransferTx = jest.fn();
const mockGetUpdatableIdentity = jest.fn();
const mockPushUpdateIdentityTx = jest.fn();
const mockCreateUnfundedCurrencyTransferTransaction = jest.fn(
  () => 'unfunded-gift',
);
const mockValidateFundedCurrencyTransfer = jest.fn(() => ({
  valid: true,
  fees: {
    [mockRootCoin.system_id]: '10000',
  },
}));
const mockGetFundedTxBuilder = jest.fn();
const mockFromWIF = jest.fn();
const mockTransactionFromHex = jest.fn(() => ({ins: []}));

jest.mock('../../crypto/randomBytes', () => ({
  randomBytes: mockRandomBytes,
}));

jest.mock('../../keys', () => ({
  deriveKeyPair: mockDeriveKeyPair,
}));

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    initEndpoint: mockInitEndpoint,
    getEndpoint: mockGetEndpoint,
  },
}));

jest.mock('../../CoinData/CoinsList', () => ({
  coinsList: {
    VRSC: mockRootCoin,
    VRSCTEST: mockTestCoin,
  },
}));

jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    findCoinObj: jest.fn(systemId => {
      if (systemId === mockRootCoin.system_id || systemId === 'VRSC') {
        return mockRootCoin;
      }

      if (systemId === mockTestCoin.system_id || systemId === 'VRSCTEST') {
        return mockTestCoin;
      }

      return null;
    }),
  },
}));

jest.mock('../../api/channels/vrpc/callCreators', () => ({
  fundRawTransaction: mockFundRawTransaction,
  getBlock: mockGetBlock,
  getBlockHash: mockGetBlockHash,
  getAddressDeltas: mockGetAddressDeltas,
  getAddressUtxos: mockGetAddressUtxos,
  getInfo: mockGetInfo,
  getSpendableUtxos: mockGetSpendableUtxos,
  getTransaction: mockGetTransaction,
  sendRawTransaction: mockSendRawTransaction,
}));

jest.mock('../../api/channels/verusid/callCreators', () => ({
  getCurrency: jest.fn(async (systemId, currencyId) => ({
    result: {
      currencyid: currencyId,
      fullyqualifiedname: currencyId,
    },
  })),
  getFriendlyNameMap: jest.fn(async () => ({})),
  getIdentity: mockGetIdentity,
}));

jest.mock('../../api/channels/verusid/requests/updateIdentity', () => ({
  createUpdateIdentityTxWithUtxos: mockCreateUpdateIdentityTxWithUtxos,
  createUpdateIdentityWithCurrencyTransferTx: mockCreateUpdateIdentityWithCurrencyTransferTx,
  getUpdatableIdentity: mockGetUpdatableIdentity,
  pushUpdateIdentityTx: mockPushUpdateIdentityTx,
}));

jest.mock('../../auth/authBox', () => ({
  requestPrivKey: jest.fn(),
}));

jest.mock('@bitgo/utxo-lib/dist/src/smart_transactions', () => ({
  unpackOutput: jest.fn(() => ({})),
}));

jest.mock('verusid-ts-client', () => {
  const actual = jest.requireActual('verusid-ts-client');

  return {
    ...actual,
    VerusIdInterface: {
      ...actual.VerusIdInterface,
      createUnfundedCurrencyTransferTransaction: mockCreateUnfundedCurrencyTransferTransaction,
    },
  };
});

jest.mock('@bitgo/utxo-lib', () => ({
  ECPair: {
    fromWIF: mockFromWIF,
  },
  Transaction: {
    fromHex: mockTransactionFromHex,
    SIGHASH_ALL: 1,
  },
  networks: {
    verus: {},
  },
  smarttxs: {
    getFundedTxBuilder: mockGetFundedTxBuilder,
    validateFundedCurrencyTransfer: mockValidateFundedCurrencyTransfer,
  },
}));

const {
  CreateWalletBackupDetailsOrdinalVDXFObject,
  GenericRequest,
  SpendableKeyDetailsOrdinalVDXFObject,
} = require('verus-typescript-primitives');
const {
  GIFT_CARD_STATUS_FUNDED,
  GIFT_CARD_STATUS_REDEEMED,
  addGiftCardPendingFunding,
  buildGiftCardNfcDeeplinkUri,
  canDeleteGiftCard,
  createGiftCard,
  discoverGiftCardIdentityFunds,
  getGiftCardClaimInfo,
  getGiftCardPendingFundings,
  getGiftCardFundingTopups,
  getGiftCardMnemonic,
  getSubmittedGiftCardFundingIdentities,
  hasGiftCardBeenShared,
  hasPendingGiftCardFunding,
  markGiftCardShared,
  normalizeGiftCardServiceData,
  parseGiftCardRequest,
  preflightGiftCardFunding,
  removeGiftCard,
  refreshGiftCardStatus,
  unlinkGiftCardFundingIdentitiesFromVerusIdData,
  upsertGiftCard,
  upsertGiftCardIfUnchanged,
  verifyGiftCardAddresses,
} = require('../../giftCard/giftCard');

describe('gift card helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomBytes.mockImplementation(length => Promise.resolve(Buffer.alloc(length)));
    mockDeriveKeyPair.mockImplementation(async (mnemonic, coinObj) => ({
      addresses: [`R-${coinObj.system_id}`],
      privKey: `K-${coinObj.system_id}`,
    }));
    mockGetAddressUtxos.mockResolvedValue({result: []});
    mockGetAddressDeltas.mockResolvedValue({result: []});
    mockGetBlockHash.mockResolvedValue({result: 'block-hash'});
    mockGetBlock.mockResolvedValue({result: {time: 1710000000}});
    mockFundRawTransaction.mockResolvedValue({result: {hex: 'funded-gift'}});
    mockGetInfo.mockResolvedValue({result: {longestchain: 1000}});
    mockGetSpendableUtxos.mockResolvedValue([]);
    mockGetTransaction.mockResolvedValue({
      result: {
        confirmations: 1,
      },
    });
    mockSendRawTransaction.mockResolvedValue({result: 'broadcast-txid'});
    mockCreateUnfundedCurrencyTransferTransaction.mockReturnValue('unfunded-gift');
    mockValidateFundedCurrencyTransfer.mockReturnValue({
      valid: true,
      fees: {
        [mockRootCoin.system_id]: '10000',
      },
    });
    mockTransactionFromHex.mockReturnValue({ins: []});
    mockGetIdentity.mockResolvedValue({
      error: {
        message: 'identity not found',
      },
    });
    mockGetUpdatableIdentity.mockResolvedValue({
      tx: 'raw-identity-tx',
      identity: {
        setPrimaryAddresses: jest.fn(),
      },
    });
    mockCreateUpdateIdentityTxWithUtxos.mockImplementation(async args => ({
      hex: 'identity-update-tx',
      utxos: args.utxos,
      deltas: new Map([[args.systemId, '-10000']]),
    }));
    mockCreateUpdateIdentityWithCurrencyTransferTx.mockImplementation(
      async args => ({
        hex: 'identity-update-with-funds-tx',
        utxos: args.utxos,
        deltas: new Map([[args.systemId, '-20000']]),
      }),
    );
    mockPushUpdateIdentityTx.mockResolvedValue({result: 'identity-txid'});
  });

  it('creates an unencrypted spendable-key gift card without storing the mnemonic', async () => {
    const card = await createGiftCard({
      label: 'Welcome',
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });

    expect(card.label).toBe('Welcome');
    expect(card.encrypted).toBe(false);
    expect(card.addressesBySystem[mockRootCoin.system_id]).toBe(
      `R-${mockRootCoin.system_id}`,
    );
    expect(card.mnemonic).toBeUndefined();
    expect(card.sharedAt).toBeNull();
    expect(card.requestUri).toMatch(/^verus:\/\//);
    expect(canDeleteGiftCard(card)).toBe(true);
    expect(parseGiftCardRequest(card).spendableKeyOrdinal).toBeInstanceOf(
      SpendableKeyDetailsOrdinalVDXFObject,
    );
  });

  it('keeps gift cards with duplicate labels keyed by card id', () => {
    const claimedCard = {
      id: 'claimed-card-id',
      label: 'Same Label',
      addressesBySystem: {
        [mockRootCoin.system_id]: 'R-claimed-card',
      },
      status: {
        state: GIFT_CARD_STATUS_REDEEMED,
        redeemed: true,
        systems: [],
      },
    };
    const newCard = {
      id: 'new-card-id',
      label: 'Same Label',
      addressesBySystem: {
        [mockRootCoin.system_id]: 'R-new-card',
      },
      status: {
        state: 'new',
        redeemed: false,
        systems: [],
      },
    };
    const normalized = normalizeGiftCardServiceData({
      cards: {
        'Same Label': claimedCard,
        'other-storage-key': newCard,
      },
    });
    const removedClaimed = removeGiftCard(normalized, claimedCard.id);
    const upserted = upsertGiftCard(removedClaimed, {
      ...newCard,
      label: 'Same Label',
    });

    expect(Object.keys(normalized.cards).sort()).toEqual([
      'claimed-card-id',
      'new-card-id',
    ]);
    expect(removedClaimed.cards[claimedCard.id]).toBeUndefined();
    expect(removedClaimed.cards[newCard.id]).toEqual({
      ...newCard,
      sharedAt: null,
    });
    expect(Object.values(upserted.cards)).toHaveLength(1);
    expect(upserted.cards[newCard.id].label).toBe('Same Label');
  });

  it('persists the first share time and never replaces it', () => {
    const firstSharedAt = 1710000000000;
    const card = markGiftCardShared(
      {
        id: 'shared-card',
        sharedAt: null,
        updatedAt: 1,
      },
      firstSharedAt,
    );

    expect(hasGiftCardBeenShared(card)).toBe(true);
    expect(card.sharedAt).toBe(firstSharedAt);
    expect(markGiftCardShared(card, firstSharedAt + 1)).toBe(card);
    expect(
      normalizeGiftCardServiceData({
        cards: {
          [card.id]: card,
        },
      }).cards[card.id].sharedAt,
    ).toBe(firstSharedAt);
  });

  it('does not overwrite a card changed after a status refresh began', () => {
    const sourceCard = {
      id: 'card-id',
      label: 'Gift',
      sharedAt: null,
      updatedAt: 1,
      status: {state: 'new'},
      fundingHistory: [],
    };
    const currentCard = {
      ...sourceCard,
      updatedAt: 2,
      fundingHistory: [{status: 'pending', txids: ['new-tx']}],
    };
    const refreshedCard = {
      ...sourceCard,
      updatedAt: 3,
      status: {state: 'funded'},
    };
    const serviceData = {
      cards: {
        [sourceCard.id]: currentCard,
      },
    };

    expect(
      upsertGiftCardIfUnchanged(
        serviceData,
        sourceCard,
        refreshedCard,
      ).cards[sourceCard.id],
    ).toEqual(currentCard);
  });

  it('creates encrypted gift cards that require the claim password', async () => {
    const card = await createGiftCard({
      label: 'Encrypted',
      password: 'claim-password',
      kdfIters: 1,
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });

    expect(card.encrypted).toBe(true);
    expect(() => getGiftCardMnemonic({card})).toThrow('encrypted');
    expect(getGiftCardMnemonic({card, password: 'claim-password'})).toContain(
      'abandon',
    );
  });

  it('verifies saved card addresses by deriving them from the card seed', async () => {
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });

    await expect(
      verifyGiftCardAddresses({
        card,
        activeCoinsForUser: [],
        systems: [mockRootCoin.system_id],
      }),
    ).resolves.toBeTruthy();

    await expect(
      verifyGiftCardAddresses({
        card: {
          ...card,
          addressesBySystem: {
            [mockRootCoin.system_id]: 'R-different',
          },
        },
        activeCoinsForUser: [],
        systems: [mockRootCoin.system_id],
      }),
    ).rejects.toThrow('verification failed');
  });

  it('builds an NFC deeplink with wallet backup request and spendable key details', async () => {
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const uri = buildGiftCardNfcDeeplinkUri(card);
    const request = GenericRequest.fromWalletDeeplinkUri(uri);

    expect(
      request.details.some(
        detail => detail instanceof CreateWalletBackupDetailsOrdinalVDXFObject,
      ),
    ).toBe(true);
    expect(
      request.details.some(
        detail => detail instanceof SpendableKeyDetailsOrdinalVDXFObject,
      ),
    ).toBe(true);
  });

  it('calculates minimum native redemption fee topups', () => {
    const nonNativeTopup = getGiftCardFundingTopups({
      funds: [
        {
          systemId: mockRootCoin.system_id,
          currencyId: 'reserve-currency',
          amount: '5',
        },
      ],
      identities: [],
    });

    expect(nonNativeTopup[mockRootCoin.system_id].amount).toBe('0.0002');

    const identityTopup = getGiftCardFundingTopups({
      funds: [],
      identities: [
        {
          systemId: mockRootCoin.system_id,
          identityAddress: 'i-id',
        },
      ],
    });

    expect(identityTopup[mockRootCoin.system_id].amount).toBe('0.0001');

    const identityWithNativeFeeFundsTopup = getGiftCardFundingTopups(
      {
        funds: [],
        identities: [
          {
            systemId: mockRootCoin.system_id,
            identityAddress: 'i-funded-id',
          },
        ],
      },
      {
        identityFunding: [
          {
            systemId: mockRootCoin.system_id,
            identityAddress: 'i-funded-id',
            currencies: [
              {
                currencyId: mockRootCoin.system_id,
                satoshis: '10000',
              },
            ],
          },
        ],
      },
    );

    expect(
      identityWithNativeFeeFundsTopup[mockRootCoin.system_id],
    ).toBeUndefined();

    const covered = getGiftCardFundingTopups({
      funds: [
        {
          systemId: mockRootCoin.system_id,
          currencyId: mockRootCoin.system_id,
          amount: '1',
        },
      ],
      identities: [],
    });

    expect(covered[mockRootCoin.system_id]).toBeUndefined();
  });

  it('tracks only identities with submitted funding transactions on partial results', () => {
    const fundingResult = {
      preflightPlan: {
        selections: {
          identities: [
            {
              chain: 'VRSC',
              systemId: mockRootCoin.system_id,
              identityAddress: 'i-submitted',
              fullyQualifiedName: 'submitted@',
            },
            {
              chain: 'VRSC',
              systemId: mockRootCoin.system_id,
              identityAddress: 'i-not-submitted',
              fullyQualifiedName: 'not-submitted@',
            },
          ],
        },
      },
      results: [
        {
          type: 'identity',
          systemId: mockRootCoin.system_id,
          txid: 'submitted-txid',
          identity: {
            identityAddress: 'i-submitted',
            fullyQualifiedName: 'submitted@',
          },
        },
      ],
    };
    const submittedIdentities =
      getSubmittedGiftCardFundingIdentities(fundingResult);
    const pendingCard = addGiftCardPendingFunding(
      {fundingHistory: []},
      fundingResult,
    );

    expect(submittedIdentities).toEqual([
      {
        chain: 'VRSC',
        systemId: mockRootCoin.system_id,
        identityAddress: 'i-submitted',
        fullyQualifiedName: 'submitted@',
      },
    ]);
    expect(getGiftCardPendingFundings(pendingCard)[0].identities).toEqual(
      submittedIdentities,
    );
  });

  it('rejects funding after a gift card has been shared', async () => {
    await expect(
      preflightGiftCardFunding({
        card: {
          id: 'shared-card',
          sharedAt: 1710000000000,
        },
        selections: {
          funds: [],
          identities: [],
        },
      }),
    ).rejects.toThrow('Shared gift cards cannot be funded');
  });

  it('rejects gift card funding transactions that exceed the planned fee', async () => {
    const cardAddress = 'RDCr3h5wYGoMh2QF7akoZy2GNsjCeSqgpu';

    mockDeriveKeyPair.mockImplementation(async () => ({
      addresses: [cardAddress],
      privKey: `K-${mockRootCoin.system_id}`,
    }));
    mockGetSpendableUtxos.mockResolvedValue([
      {
        txid: 'aa'.repeat(32),
        outputIndex: 0,
        satoshis: 100000000,
        script: '00',
      },
    ]);
    mockValidateFundedCurrencyTransfer.mockReturnValueOnce({
      valid: true,
      fees: {
        [mockRootCoin.system_id]: '10001',
      },
    });

    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });

    await expect(
      preflightGiftCardFunding({
        card,
        selections: {
          funds: [
            {
              systemId: mockRootCoin.system_id,
              currencyId: mockRootCoin.system_id,
              amount: '1',
              coinObj: mockRootCoin,
            },
          ],
          identities: [],
        },
        activeCoinsForUser: [mockRootCoin],
        activeAccount: {
          keys: {
            [mockRootCoin.id]: {
              vrpc: {
                addresses: ['RSourceAddress'],
              },
            },
          },
        },
      }),
    ).rejects.toThrow('Fee exceeds maximum gift card funding fee.');
  });

  it('uses native funds from a mixed-currency VerusID UTXO when wallet fee funds are unavailable', async () => {
    const cardAddress = 'RDCr3h5wYGoMh2QF7akoZy2GNsjCeSqgpu';
    const identityFeeUtxo = {
      txid: 'bb'.repeat(32),
      outputIndex: 1,
      satoshis: 10000,
      currencyvalues: {
        [mockRootCoin.system_id]: 0.0001,
        'reserve-currency': 1,
      },
      script: '00',
      isspendable: 1,
    };

    mockDeriveKeyPair.mockImplementation(async () => ({
      addresses: [cardAddress],
      privKey: `K-${mockRootCoin.system_id}`,
    }));
    mockGetSpendableUtxos.mockResolvedValue([]);
    mockGetIdentity.mockResolvedValueOnce({
      result: {
        blockheight: 123,
      },
    });

    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [mockRootCoin],
    });
    const plan = await preflightGiftCardFunding({
      card,
      selections: {
        funds: [],
        identities: [
          {
            key: 'root-system:i-funded-id',
            chain: 'VRSC',
            systemId: mockRootCoin.system_id,
            identityAddress: 'i-funded-id',
            fullyQualifiedName: 'funded@',
          },
        ],
      },
      identityFunding: [
        {
          key: 'root-system:i-funded-id',
          systemId: mockRootCoin.system_id,
          identityAddress: 'i-funded-id',
          currencies: [
            {
              currencyId: mockRootCoin.system_id,
              satoshis: '10000',
            },
          ],
          utxos: [identityFeeUtxo],
        },
      ],
      activeCoinsForUser: [mockRootCoin],
      activeAccount: {
        keys: {
          [mockRootCoin.id]: {
            vrpc: {
              addresses: ['RSourceAddress'],
            },
          },
        },
      },
    });

    expect(plan.topups[mockRootCoin.system_id]).toBeUndefined();
    expect(mockCreateUpdateIdentityTxWithUtxos).toHaveBeenCalledWith(
      expect.objectContaining({
        changeAaddr: 'i-funded-id',
        utxos: [identityFeeUtxo],
      }),
    );
    expect(plan.transactions[0]).toEqual(
      expect.objectContaining({
        type: 'identity',
        usesIdentityFeeFunds: true,
        feeSource: 'identity',
        feeSats: '10000',
      }),
    );
  });

  it('summarizes funds already held by selected VerusIDs', async () => {
    mockGetAddressUtxos.mockResolvedValueOnce({
      result: [
        {
          txid: 'native-and-reserve',
          outputIndex: 0,
          satoshis: 100000000,
          currencyvalues: {
            [mockRootCoin.system_id]: 1,
            'reserve-currency': 2,
          },
        },
        {
          txid: 'native-currency-value',
          outputIndex: 1,
          satoshis: 0,
          currencyvalues: {
            [mockRootCoin.system_id]: 0.25,
          },
        },
      ],
    });

    const fundedIdentities = await discoverGiftCardIdentityFunds({
      identities: [
        {
          key: 'root-system:i-funded',
          systemId: mockRootCoin.system_id,
          identityAddress: 'i-funded',
          fullyQualifiedName: 'funded@',
        },
      ],
    });

    expect(mockGetAddressUtxos).toHaveBeenCalledWith(
      mockRootCoin.system_id,
      ['i-funded'],
      true,
    );
    expect(fundedIdentities[0].currencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currencyId: mockRootCoin.system_id,
          amount: '1.25',
        }),
        expect.objectContaining({
          currencyId: 'reserve-currency',
          amount: '2',
        }),
      ]),
    );
  });

  it('confirms pending funding only after its submitted transaction confirms', async () => {
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const pendingCard = addGiftCardPendingFunding(card, {
      results: [
        {
          systemId: mockRootCoin.system_id,
          txid: 'funding-txid',
        },
      ],
    });

    expect(hasPendingGiftCardFunding(pendingCard)).toBe(true);
    expect(getGiftCardPendingFundings(pendingCard)[0].txids).toEqual([
      'funding-txid',
    ]);
    expect(canDeleteGiftCard({
      ...pendingCard,
      status: {
        state: GIFT_CARD_STATUS_REDEEMED,
        redeemed: true,
        systems: [],
      },
    })).toBe(false);

    mockGetAddressUtxos.mockResolvedValue({
      result: [
        {
          txid: 'confirmed-funding',
          outputIndex: 0,
          satoshis: 100000000,
          script: '00',
          isspendable: 1,
        },
      ],
    });
    const refreshed = await refreshGiftCardStatus({
      card: pendingCard,
      activeCoinsForUser: [],
    });

    expect(hasPendingGiftCardFunding(refreshed)).toBe(false);
    expect(refreshed.fundingHistory[0].status).toBe('confirmed');
    expect(mockGetTransaction).toHaveBeenCalledWith(
      mockRootCoin.system_id,
      'funding-txid',
      1,
    );
  });

  it('does not clear a top-up using claims that were already on the card', async () => {
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const pendingCard = addGiftCardPendingFunding(
      {
        ...card,
        status: {
          ...card.status,
          state: GIFT_CARD_STATUS_FUNDED,
          hasClaims: true,
        },
      },
      {
        results: [
          {
            systemId: mockRootCoin.system_id,
            txid: 'new-topup-txid',
            type: 'currency',
          },
        ],
      },
    );

    mockGetAddressUtxos.mockResolvedValue({
      result: [
        {
          txid: 'old-card-funding',
          outputIndex: 0,
          satoshis: 100000000,
          script: '00',
          isspendable: 1,
        },
      ],
    });
    mockGetTransaction.mockResolvedValueOnce({
      result: {
        confirmations: 0,
      },
    });

    const refreshed = await refreshGiftCardStatus({
      card: pendingCard,
      activeCoinsForUser: [],
    });

    expect(hasPendingGiftCardFunding(refreshed)).toBe(true);
    expect(refreshed.fundingHistory[0].status).toBe('pending');
  });

  it('keeps funds and ID funding pending until the expected ID is visible', async () => {
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const pendingCard = addGiftCardPendingFunding(card, {
      preflightPlan: {
        selections: {
          identities: [
            {
              chain: 'VRSC',
              systemId: mockRootCoin.system_id,
              identityAddress: 'i-transfer',
              fullyQualifiedName: 'transfer@',
            },
          ],
        },
      },
      results: [
        {
          systemId: mockRootCoin.system_id,
          txid: 'funds-and-id-txid',
        },
      ],
    });

    mockGetAddressUtxos.mockResolvedValueOnce({
      result: [
        {
          txid: 'fund-output-visible-first',
          outputIndex: 0,
          satoshis: 100000000,
          script: '00',
          isspendable: 1,
        },
      ],
    });
    mockGetIdentity.mockResolvedValue({
      result: {
        identity: {
          identityaddress: 'i-transfer',
          minimumsignatures: 1,
          name: 'transfer',
          parent: mockRootCoin.system_id,
          primaryaddresses: ['R-not-the-card'],
        },
      },
    });

    const refreshed = await refreshGiftCardStatus({
      card: pendingCard,
      activeCoinsForUser: [],
    });

    expect(refreshed.status.currencies).toBeUndefined();
    expect(refreshed.status.systems[0].currencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currencyId: mockRootCoin.system_id,
          amount: '1',
        }),
      ]),
    );
    expect(hasPendingGiftCardFunding(refreshed)).toBe(true);
  });

  it('uses expected pending IDs to refresh identity transfers and carried funds', async () => {
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const pendingCard = addGiftCardPendingFunding(card, {
      preflightPlan: {
        selections: {
          identities: [
            {
              chain: 'VRSC',
              systemId: mockRootCoin.system_id,
              identityAddress: 'i-transfer',
              fullyQualifiedName: 'transfer@',
            },
          ],
        },
      },
      results: [
        {
          systemId: mockRootCoin.system_id,
          txid: 'funds-and-id-txid',
        },
      ],
    });
    const identityResult = {
      status: 'active',
      identity: {
        identityaddress: 'i-transfer',
        minimumsignatures: 1,
        name: 'transfer',
        parent: mockRootCoin.system_id,
        primaryaddresses: [`R-${mockRootCoin.system_id}`],
      },
    };

    mockGetIdentity.mockResolvedValue({result: identityResult});
    mockGetAddressUtxos
      .mockResolvedValueOnce({result: []})
      .mockResolvedValueOnce({
        result: [
          {
            txid: 'identity-carried-funds',
            outputIndex: 0,
            satoshis: 100000000,
            currencyvalues: {
              'reserve-currency': 2,
            },
            script: '00',
            isspendable: 1,
          },
        ],
      });

    const refreshed = await refreshGiftCardStatus({
      card: pendingCard,
      activeCoinsForUser: [],
    });

    expect(hasPendingGiftCardFunding(refreshed)).toBe(false);
    expect(refreshed.status.systems[0].identities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identityAddress: 'i-transfer',
        }),
      ]),
    );
    expect(refreshed.status.systems[0].currencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currencyId: mockRootCoin.system_id,
          amount: '1',
        }),
        expect.objectContaining({
          currencyId: 'reserve-currency',
          amount: '2',
        }),
      ]),
    );
  });

  it('uses RPC-shaped expected IDs from funding history to refresh identity transfers', async () => {
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const pendingCard = {
      ...card,
      fundingHistory: [
        {
          createdAt: Date.now(),
          status: 'pending',
          pending: true,
          txids: ['identity-funding-txid'],
          systems: [mockRootCoin.system_id],
          identities: [
            {
              systemid: mockRootCoin.system_id,
              identityaddress: 'i-transfer',
              fullyqualifiedname: 'transfer@',
            },
          ],
        },
      ],
    };
    const identityResult = {
      status: 'active',
      identity: {
        identityaddress: 'i-transfer',
        minimumsignatures: 1,
        name: 'transfer',
        parent: mockRootCoin.system_id,
        primaryaddresses: [`R-${mockRootCoin.system_id}`],
      },
    };

    mockGetIdentity.mockResolvedValue({result: identityResult});
    mockGetAddressUtxos.mockResolvedValue({result: []});

    const refreshed = await refreshGiftCardStatus({
      card: pendingCard,
      activeCoinsForUser: [],
    });

    expect(hasPendingGiftCardFunding(refreshed)).toBe(false);
    expect(refreshed.status.systems[0].identities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identityAddress: 'i-transfer',
          fullyQualifiedName: 'transfer@',
        }),
      ]),
    );
  });

  it('unlinks VerusIDs transferred to gift cards from service data', () => {
    const serviceData = {
      linked_ids: {
        VRSC: {
          'i-transfer': 'transfer@',
          'i-keep': 'keep@',
        },
        VRSCTEST: {
          'i-transfer': 'test-transfer@',
        },
      },
    };

    const nextServiceData = unlinkGiftCardFundingIdentitiesFromVerusIdData(
      serviceData,
      [
        {
          chain: 'VRSC',
          identityAddress: 'i-transfer',
        },
      ],
    );

    expect(nextServiceData.linked_ids).toEqual({
      VRSC: {
        'i-keep': 'keep@',
      },
      VRSCTEST: {
        'i-transfer': 'test-transfer@',
      },
    });
    expect(serviceData.linked_ids.VRSC['i-transfer']).toBe('transfer@');
  });

  it('classifies refreshed cards as redeemed when empty cards have deltas', async () => {
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });

    mockGetAddressDeltas.mockResolvedValue({
      result: [{txid: 'spent'}],
    });

    const refreshed = await refreshGiftCardStatus({
      card,
      activeCoinsForUser: [],
    });

    expect(refreshed.status.state).toBe(GIFT_CARD_STATUS_REDEEMED);
    expect(canDeleteGiftCard(refreshed)).toBe(true);
  });

  it('ignores claimed status data from another card with the same label', async () => {
    const card = await createGiftCard({
      label: 'Same Label',
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const currentClaimAddress = card.addressesBySystem[mockRootCoin.system_id];
    const staleStatusCard = {
      ...card,
      status: {
        state: GIFT_CARD_STATUS_REDEEMED,
        redeemed: true,
        hasClaims: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimAddress: 'R-old-card-address',
            currencies: [],
            identities: [
              {
                identityAddress: 'i-old-identity',
                fullyQualifiedName: 'old@',
              },
            ],
            deltas: [
              {
                txid: 'old-card-claim',
                satoshis: -100000000,
                blocktime: 1710000100,
              },
            ],
          },
        ],
      },
      fundingHistory: [],
    };

    mockGetIdentity.mockResolvedValue({
      result: {
        identity: {
          identityaddress: 'i-old-identity',
          primaryaddresses: ['R-recipient'],
          minimumsignatures: 1,
        },
      },
    });

    expect(getGiftCardClaimInfo(staleStatusCard)).toBeNull();

    const refreshed = await refreshGiftCardStatus({
      card: staleStatusCard,
      activeCoinsForUser: [],
    });

    expect(refreshed.status.state).toBe('new');
    expect(refreshed.status.identityRedemptions).toEqual([]);
    expect(mockGetIdentity).not.toHaveBeenCalledWith(
      mockRootCoin.system_id,
      'i-old-identity',
    );
    expect(refreshed.status.systems[0].claimAddress).toBe(currentClaimAddress);
  });

  it('extracts claimed by and claimed time from redeemed card deltas', async () => {
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const claimAddress = card.addressesBySystem[mockRootCoin.system_id];

    mockGetAddressDeltas.mockResolvedValue({
      result: [
        {
          txid: 'funding-txid',
          satoshis: 100000000,
          blocktime: 1710000000,
          height: 100,
        },
        {
          txid: 'claim-txid',
          satoshis: -100000000,
          blocktime: 1710000100,
          height: 101,
          sent: {
            outputs: [
              {
                addresses: [claimAddress, 'R-claim-recipient'],
                amounts: {
                  [mockRootCoin.system_id]: 0.9999,
                },
              },
            ],
          },
        },
      ],
    });

    const refreshed = await refreshGiftCardStatus({
      card,
      activeCoinsForUser: [],
    });
    const claimInfo = getGiftCardClaimInfo(refreshed);

    expect(claimInfo).toEqual(
      expect.objectContaining({
        txid: 'claim-txid',
        height: 101,
        claimedAt: 1710000100000,
        claimedByAddresses: ['R-claim-recipient'],
      }),
    );
    expect(claimInfo.systems[0]).toEqual(
      expect.objectContaining({
        txid: 'claim-txid',
        claimedByAddresses: ['R-claim-recipient'],
      }),
    );
  });

  it('classifies ID-only cards as redeemed after the funded identity moves to a recipient address', async () => {
    const recipientAddress = 'RGndY1TFKWqHeJ7CfseU1Pi24KZCuqU4s5';
    const card = await createGiftCard({
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const fundedCard = addGiftCardPendingFunding(card, {
      preflightPlan: {
        selections: {
          identities: [
            {
              chain: 'VRSC',
              systemId: mockRootCoin.system_id,
              identityAddress: 'i-transfer',
              fullyQualifiedName: 'transfer@',
            },
          ],
        },
      },
      results: [
        {
          type: 'identity',
          systemId: mockRootCoin.system_id,
          txid: 'identity-funding-txid',
          identity: {
            identityAddress: 'i-transfer',
            fullyQualifiedName: 'transfer@',
          },
        },
      ],
    });
    const claimAddress = fundedCard.addressesBySystem[mockRootCoin.system_id];
    const observedFundedCard = {
      ...fundedCard,
      status: {
        ...fundedCard.status,
        state: GIFT_CARD_STATUS_FUNDED,
        hasClaims: true,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimAddress,
            currencies: [],
            identities: [
              {
                identityAddress: 'i-transfer',
                fullyQualifiedName: 'transfer@',
                result: {
                  txid: 'identity-funding-txid',
                  blockheight: 300,
                  identity: {
                    identityaddress: 'i-transfer',
                    primaryaddresses: [claimAddress],
                    minimumsignatures: 1,
                  },
                },
              },
            ],
            deltas: [],
            deltaCount: 0,
            redeemed: false,
          },
        ],
      },
    };

    mockGetIdentity.mockResolvedValue({
      result: {
        txid: 'identity-claim-txid',
        blockheight: 333,
        identity: {
          identityaddress: 'i-transfer',
          primaryaddresses: [recipientAddress],
          minimumsignatures: 1,
        },
      },
    });
    mockGetBlock.mockResolvedValue({result: {time: 1710000200}});

    const refreshed = await refreshGiftCardStatus({
      card: observedFundedCard,
      activeCoinsForUser: [],
    });
    const claimInfo = getGiftCardClaimInfo(refreshed);

    expect(refreshed.status.state).toBe(GIFT_CARD_STATUS_REDEEMED);
    expect(refreshed.fundingHistory[0]).toEqual(
      expect.objectContaining({
        pending: false,
        status: 'confirmed',
      }),
    );
    expect(refreshed.status.identityRedemptions[0]).toEqual(
      expect.objectContaining({
        systemId: mockRootCoin.system_id,
        txid: 'identity-claim-txid',
        height: 333,
        claimedAt: 1710000200000,
        claimedByAddresses: [recipientAddress],
      }),
    );
    expect(mockGetBlockHash).toHaveBeenCalledWith(mockRootCoin.system_id, 333);
    expect(mockGetBlock).toHaveBeenCalledWith(
      mockRootCoin.system_id,
      'block-hash',
      true,
    );
    expect(claimInfo).toEqual(
      expect.objectContaining({
        txid: 'identity-claim-txid',
        height: 333,
        claimedAt: 1710000200000,
        claimedByAddresses: [recipientAddress],
      }),
    );
  });

  it('keeps a reused ID-only card funded when getidentity returns an older claimed state', async () => {
    const oldRecipientAddress = 'RGndY1TFKWqHeJ7CfseU1Pi24KZCuqU4s5';
    const card = await createGiftCard({
      label: 'Same Label',
      requestIsTestnet: true,
      activeCoinsForUser: [],
    });
    const fundedCard = addGiftCardPendingFunding(card, {
      preflightPlan: {
        selections: {
          identities: [
            {
              chain: 'VRSCTEST',
              systemId: mockTestCoin.system_id,
              identityAddress: 'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
              fullyQualifiedName: 'test.VRSCTEST@',
            },
          ],
        },
      },
      results: [
        {
          type: 'identity',
          systemId: mockTestCoin.system_id,
          txid: 'new-card-funding-txid',
          identity: {
            identityAddress: 'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
            fullyQualifiedName: 'test.VRSCTEST@',
          },
        },
      ],
    });
    const claimAddress = fundedCard.addressesBySystem[mockTestCoin.system_id];
    const observedFundedCard = {
      ...fundedCard,
      status: {
        ...fundedCard.status,
        state: GIFT_CARD_STATUS_FUNDED,
        hasClaims: true,
        systems: [
          {
            systemId: mockTestCoin.system_id,
            coinObj: mockTestCoin,
            claimAddress,
            currencies: [],
            identities: [
              {
                identityAddress: 'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
                fullyQualifiedName: 'test.VRSCTEST@',
                result: {
                  txid: 'new-card-funding-txid',
                  blockheight: 500,
                  identity: {
                    identityaddress: 'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
                    primaryaddresses: [claimAddress],
                    minimumsignatures: 1,
                  },
                },
              },
            ],
            deltas: [],
            deltaCount: 0,
            redeemed: false,
          },
        ],
      },
    };

    mockGetIdentity.mockResolvedValue({
      result: {
        txid: 'old-card-claim-txid',
        blockheight: 400,
        fullyqualifiedname: 'test.VRSCTEST@',
        identity: {
          identityaddress: 'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
          primaryaddresses: [oldRecipientAddress],
          minimumsignatures: 1,
        },
      },
    });

    const refreshed = await refreshGiftCardStatus({
      card: observedFundedCard,
      activeCoinsForUser: [],
    });

    expect(refreshed.status.state).toBe(GIFT_CARD_STATUS_FUNDED);
    expect(refreshed.status.redeemed).toBe(false);
    expect(refreshed.status.identityRedemptions).toEqual([]);
    expect(refreshed.status.systems[0].identities).toEqual([
      expect.objectContaining({
        identityAddress: 'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
        fullyQualifiedName: 'test.VRSCTEST@',
      }),
    ]);
    expect(getGiftCardClaimInfo(refreshed)).toBeNull();
  });

  it('records when ID-only address lookup requires an identity index', async () => {
    const card = await createGiftCard({
      requestIsTestnet: true,
      activeCoinsForUser: [],
    });
    const getIdentitiesWithAddress = jest.fn().mockResolvedValue({
      error: {
        message:
          'getidentitieswithaddress requires -idindex=1 when starting the daemon',
      },
    });

    mockGetEndpoint.mockReturnValueOnce({
      getIdentitiesWithAddress,
    });

    const refreshed = await refreshGiftCardStatus({
      card,
      activeCoinsForUser: [],
    });

    expect(refreshed.status.state).toBe('new');
    expect(refreshed.status.systems[0]).toEqual(
      expect.objectContaining({
        systemId: mockTestCoin.system_id,
        identityLookupError:
          'getidentitieswithaddress requires -idindex=1 when starting the daemon',
      }),
    );
    expect(getIdentitiesWithAddress).toHaveBeenCalledWith({
      address: card.addressesBySystem[mockTestCoin.system_id],
      unspent: true,
    });
  });

  it('uses previously discovered IDs as expected IDs when indexed address lookup is unavailable', async () => {
    const card = await createGiftCard({
      requestIsTestnet: true,
      activeCoinsForUser: [],
    });
    const claimAddress = card.addressesBySystem[mockTestCoin.system_id];
    const knownIdentityCard = {
      ...card,
      status: {
        ...card.status,
        state: GIFT_CARD_STATUS_FUNDED,
        hasClaims: true,
        systems: [
          {
            systemId: mockTestCoin.system_id,
            coinObj: mockTestCoin,
            claimAddress,
            currencies: [],
            identities: [
              {
                identityAddress: 'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
                fullyQualifiedName: 'test.VRSCTEST@',
              },
            ],
          },
        ],
      },
      fundingHistory: [],
    };

    mockGetEndpoint.mockReturnValueOnce({
      getIdentitiesWithAddress: jest.fn().mockResolvedValue({
        error: {
          message:
            'getidentitieswithaddress requires -idindex=1 when starting the daemon',
        },
      }),
    });
    mockGetIdentity.mockResolvedValue({
      result: {
        fullyqualifiedname: 'test.VRSCTEST@',
        status: 'active',
        identity: {
          identityaddress: 'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
          primaryaddresses: [claimAddress],
          minimumsignatures: 1,
          name: 'test',
          parent: mockTestCoin.system_id,
        },
      },
    });

    const refreshed = await refreshGiftCardStatus({
      card: knownIdentityCard,
      activeCoinsForUser: [],
    });

    expect(refreshed.status.state).toBe(GIFT_CARD_STATUS_FUNDED);
    expect(refreshed.status.systems[0].identities).toEqual([
      expect.objectContaining({
        identityAddress: 'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
        fullyQualifiedName: 'test.VRSCTEST@',
      }),
    ]);
    expect(mockGetIdentity).toHaveBeenCalledWith(
      mockTestCoin.system_id,
      'i8jHXEEYEQ7KEoYe6eKXBib8cUBZ6vjWSd',
    );
  });
});
