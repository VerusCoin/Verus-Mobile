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
const mockPbaasCoin = {
  id: 'PBaaS',
  display_ticker: 'PBaaS',
  currency_id: 'pbaas-system',
  system_id: 'pbaas-system',
  testnet: false,
  vrpc_endpoints: ['pbaas-endpoint'],
  compatible_channels: ['vrpc'],
  tags: ['is_pbaas'],
};
const mockBtcCoin = {
  id: 'BTC',
  display_ticker: 'BTC',
  system_id: '.btc',
  testnet: false,
  compatible_channels: ['electrum', 'general'],
  tags: [],
};
const mockEthCoin = {
  id: 'ETH',
  display_ticker: 'ETH',
  system_id: '.eth',
  testnet: false,
  compatible_channels: ['eth', 'general'],
  tags: [],
};
const mockVethAssetCoin = {
  id: 'iS8TfRPfVpKo5FVfSUzfHBQxo9KuzpnqLU',
  display_ticker: 'tBTC.vETH',
  currency_id: 'iS8TfRPfVpKo5FVfSUzfHBQxo9KuzpnqLU',
  system_id: 'i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X',
  testnet: false,
  compatible_channels: ['verusid', 'vrpc', 'general'],
  tags: ['is_verus', 'is_zcash', 'is_pbaas'],
};
const mockRootClaimAddress = 'RRootClaimAddress';
const mockPbaasClaimAddress = 'RPbaasClaimAddress';
const mockDestinationAddress = 'RDCr3h5wYGoMh2QF7akoZy2GNsjCeSqgpu';
const mockPrivateAddress = 'zs1walletprivateaddress';
const mockClaimedIdentityAddress = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const mockEndpoints = {};
const mockTxInputsByHex = {};

const mockInitEndpoint = jest.fn(systemId => {
  if (mockEndpoints[systemId] == null) {
    mockEndpoints[systemId] = {
      getIdentitiesWithAddress: jest.fn().mockResolvedValue({result: []}),
      fundRawTransaction: jest.fn().mockResolvedValue({
        result: {hex: 'funded-sweep'},
      }),
    };
  }
});
const mockGetEndpoint = jest.fn(systemId => mockEndpoints[systemId]);
const mockFindCoinObj = jest.fn(systemId => {
  if (systemId === mockRootCoin.system_id) return mockRootCoin;
  if (systemId === mockPbaasCoin.system_id) return mockPbaasCoin;
  if (systemId === mockTestCoin.system_id) return mockTestCoin;
  return null;
});
const mockDeriveKeyPair = jest.fn();
const mockGetAddressUtxos = jest.fn();
const mockGetInfo = jest.fn();
const mockSendRawTransaction = jest.fn();
const mockGetCurrency = jest.fn();
const mockGetFriendlyNameMap = jest.fn();
const mockGetIdentity = jest.fn();
const mockCreateUpdateIdentityTxWithUtxos = jest.fn();
const mockCreateUpdateIdentityWithCurrencyTransferTx = jest.fn();
const mockGetUpdatableIdentity = jest.fn();
const mockPushUpdateIdentityTx = jest.fn();
const mockCreateUnfundedCurrencyTransferTransaction = jest.fn(
  () => 'unfunded-sweep',
);
const mockCreateUnfundedIdentityUpdate = jest.fn(() => 'unfunded-identity');
const mockCompleteFundedIdentityUpdate = jest.fn(() => 'combined-identity-sweep');
const mockValidateFundedCurrencyTransfer = jest.fn(() => ({valid: true}));
const mockSign = jest.fn();
const mockBuild = jest.fn(() => ({toHex: () => 'signed-sweep'}));
const mockGetFundedTxBuilder = jest.fn(() => ({
  sign: mockSign,
  build: mockBuild,
}));
const mockFromWIF = jest.fn(() => ({publicKey: Buffer.alloc(33)}));
const mockTxOutputsByHex = {};
const mockTransactionFromHex = jest.fn(hex => {
  const tx = {
    ins: mockTxInputsByHex[hex] || [],
    outs: mockTxOutputsByHex[hex] || [],
    addOutput: jest.fn((script, value) => {
      tx.outs.push({script, value});
    }),
    toHex: jest.fn(() => `${hex}-combined`),
  };

  return tx;
});
const mockUnpackOutput = jest.fn(() => ({}));

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    initEndpoint: mockInitEndpoint,
    getEndpoint: mockGetEndpoint,
  },
}));

jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    findCoinObj: mockFindCoinObj,
  },
}));

jest.mock('../../CoinData/CoinsList', () => ({
  coinsList: {
    VRSC: mockRootCoin,
    VRSCTEST: mockTestCoin,
  },
}));

jest.mock('../../keys', () => ({
  deriveKeyPair: mockDeriveKeyPair,
}));

jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getAddressUtxos: mockGetAddressUtxos,
  getInfo: mockGetInfo,
  sendRawTransaction: mockSendRawTransaction,
}));

jest.mock('../../api/channels/verusid/callCreators', () => ({
  getCurrency: mockGetCurrency,
  getFriendlyNameMap: mockGetFriendlyNameMap,
  getIdentity: mockGetIdentity,
}));

jest.mock('../../api/channels/verusid/requests/updateIdentity', () => ({
  createUpdateIdentityWithCurrencyTransferTx: mockCreateUpdateIdentityWithCurrencyTransferTx,
  createUpdateIdentityTxWithUtxos: mockCreateUpdateIdentityTxWithUtxos,
  getUpdatableIdentity: mockGetUpdatableIdentity,
  pushUpdateIdentityTx: mockPushUpdateIdentityTx,
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
    completeFundedIdentityUpdate: mockCompleteFundedIdentityUpdate,
    createUnfundedIdentityUpdate: mockCreateUnfundedIdentityUpdate,
    getFundedTxBuilder: mockGetFundedTxBuilder,
    validateFundedCurrencyTransfer: mockValidateFundedCurrencyTransfer,
  },
}));

jest.mock('@bitgo/utxo-lib/dist/src/smart_transactions', () => ({
  unpackOutput: mockUnpackOutput,
}));

const {
  broadcastSpendableKeyClaim,
  discoverSpendableKeyClaims,
  preflightSpendableKeyClaim,
} = require('../../spendableKey/spendableKey');

const makeUtxo = ({
  txid,
  outputIndex = 0,
  satoshis = 0,
  currencyvalues,
  isspendable = true,
  script = '00',
}) => ({
  txid,
  outputIndex,
  satoshis,
  currencyvalues,
  isspendable,
  script,
});

const inputForUtxo = utxo => ({
  hash: Buffer.from(utxo.txid, 'hex').reverse(),
  index: utxo.outputIndex,
});

const rootFeeUtxo = makeUtxo({
  txid: '11'.repeat(32),
  outputIndex: 0,
  satoshis: 20000,
  currencyvalues: {
    [mockRootCoin.system_id]: '0.0002',
  },
});
const rootExactFeeUtxo = makeUtxo({
  txid: '0f'.repeat(32),
  outputIndex: 5,
  satoshis: 10000,
  currencyvalues: {
    [mockRootCoin.system_id]: '0.0001',
  },
});
const rootSweepUtxo = makeUtxo({
  txid: '22'.repeat(32),
  outputIndex: 1,
  satoshis: 50000,
  currencyvalues: {
    [mockRootCoin.system_id]: '0.0005',
  },
});
const rootTokenUtxo = makeUtxo({
  txid: '33'.repeat(32),
  outputIndex: 2,
  satoshis: 0,
  currencyvalues: {
    'token-system': '1.5',
  },
});
const rootTokenCurrencyId = Object.keys(rootTokenUtxo.currencyvalues)[0];
const rootSecondTokenUtxo = makeUtxo({
  txid: '99'.repeat(32),
  outputIndex: 4,
  satoshis: 0,
  currencyvalues: {
    'second-token-system': '2',
  },
});
const rootSecondTokenCurrencyId = Object.keys(
  rootSecondTokenUtxo.currencyvalues,
)[0];
const rootIdentityUtxo = makeUtxo({
  txid: '55'.repeat(32),
  outputIndex: 3,
  satoshis: 0,
  script: 'ff',
});
const rootIdentityFundsUtxo = makeUtxo({
  txid: 'aa'.repeat(32),
  outputIndex: 0,
  satoshis: 40000,
  currencyvalues: {
    'identity-token-system': '0.25',
    [mockRootCoin.system_id]: '0.0004',
  },
  isspendable: false,
});
const rootIdentityTokenCurrencyId = 'identity-token-system';
const rootIdentityFeeUtxo = makeUtxo({
  txid: 'bb'.repeat(32),
  outputIndex: 1,
  satoshis: 20000,
  currencyvalues: {
    [mockRootCoin.system_id]: '0.0002',
    'identity-fee-token-system': '0.25',
  },
  isspendable: false,
});
const rootIdentityNonNativeFeeUtxo = makeUtxo({
  txid: 'cc'.repeat(32),
  outputIndex: 2,
  satoshis: 30000,
  currencyvalues: {
    [mockRootCoin.system_id]: '0.0003',
  },
  isspendable: false,
});
const pbaasUtxo = makeUtxo({
  txid: '44'.repeat(32),
  outputIndex: 0,
  satoshis: 30000,
});

describe('spendable key claim utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockEndpoints).forEach(key => delete mockEndpoints[key]);
    Object.keys(mockTxInputsByHex).forEach(key => delete mockTxInputsByHex[key]);
    Object.keys(mockTxOutputsByHex).forEach(key => delete mockTxOutputsByHex[key]);

    mockEndpoints[mockRootCoin.system_id] = {
      getIdentitiesWithAddress: jest.fn().mockResolvedValue({result: []}),
      fundRawTransaction: jest.fn().mockResolvedValue({
        result: {hex: 'funded-sweep'},
      }),
    };
    mockEndpoints[mockPbaasCoin.system_id] = {
      getIdentitiesWithAddress: jest.fn().mockResolvedValue({result: []}),
      fundRawTransaction: jest.fn().mockResolvedValue({
        result: {hex: 'funded-pbaas-sweep'},
      }),
    };
    mockDeriveKeyPair.mockImplementation(async (_mnemonic, coinObj) => ({
      addresses: [
        coinObj.system_id === mockPbaasCoin.system_id
          ? mockPbaasClaimAddress
          : mockRootClaimAddress,
      ],
      privKey: `wif-${coinObj.system_id}`,
    }));
    mockGetAddressUtxos.mockResolvedValue({result: []});
    mockGetInfo.mockResolvedValue({result: {longestchain: 1000}});
    mockGetCurrency.mockImplementation(async (_systemId, currencyId) => ({
      result: {
        fullyqualifiedname: `${currencyId}.currency`,
      },
    }));
    mockGetFriendlyNameMap.mockResolvedValue({});
    mockGetIdentity.mockImplementation(async (_systemId, identityAddress) => ({
      result: {
        status: 'active',
        txid: `${identityAddress}-txid`,
        vout: 0,
        fullyqualifiedname:
          identityAddress === 'rpc-identity-address'
            ? 'Brain782.valuid@'
            : 'gift@',
        identity: {
          identityaddress: identityAddress,
          minimumsignatures: 1,
          name:
            identityAddress === 'rpc-identity-address'
              ? 'Brain782'
              : 'gift',
          parent:
            identityAddress === 'rpc-identity-address'
              ? 'valuid-system'
              : mockRootCoin.system_id,
          primaryaddresses: [mockRootClaimAddress],
        },
      },
    }));
    mockGetUpdatableIdentity.mockResolvedValue({
      tx: 'raw-id-tx',
      identity: {
        setPrimaryAddresses: jest.fn(),
        setPrivateAddress: jest.fn(),
        toBuffer: jest.fn(() => Buffer.from('dd', 'hex')),
      },
    });
    mockCreateUpdateIdentityTxWithUtxos.mockImplementation(async args => ({
      hex: 'identity-hex',
      utxos: args.utxos,
      deltas: new Map(),
    }));
    mockCreateUpdateIdentityWithCurrencyTransferTx.mockResolvedValue({
      hex: 'combined-identity-sweep',
      utxos: [
        rootFeeUtxo,
        rootTokenUtxo,
        {
          txid: '77'.repeat(32),
          outputIndex: 0,
          script: 'aa',
          satoshis: 0,
        },
      ],
      deltas: new Map(),
    });
    mockPushUpdateIdentityTx.mockResolvedValue({result: 'identity-txid'});
    mockSendRawTransaction.mockResolvedValue({result: 'sweep-txid'});
    mockTxInputsByHex['funded-sweep'] = [inputForUtxo(rootSweepUtxo)];
    mockTxInputsByHex['funded-pbaas-sweep'] = [inputForUtxo(pbaasUtxo)];
    mockTxOutputsByHex['raw-id-tx'] = [
      {script: Buffer.from('aa', 'hex'), value: 0},
    ];
    mockTxOutputsByHex['unfunded-identity'] = [
      {script: Buffer.from('bb', 'hex'), value: 0},
    ];
    mockTxOutputsByHex['unfunded-sweep'] = [
      {script: Buffer.from('cc', 'hex'), value: 0},
    ];
  });

  it('discovers balances and primary-address identities on active systems', async () => {
    mockUnpackOutput.mockImplementation(
      (output, _systemId, _isInput, allowNonTransferEvals) => {
        if (output.script.toString('hex') !== 'ff') return {};
        if (!allowNonTransferEvals) throw new Error('identity output');

        return {
          master: {
            eval: 14,
            data: {
              toJson: () => ({
                identityaddress: mockClaimedIdentityAddress,
                minimumsignatures: 1,
                name: 'gift',
                primaryaddresses: [mockRootClaimAddress],
              }),
            },
          },
        };
      },
    );
    mockGetAddressUtxos.mockImplementation(async (systemId, addresses) => {
      if (systemId === mockPbaasCoin.system_id) {
        return {result: [pbaasUtxo]};
      }

      if (addresses[0] === mockClaimedIdentityAddress) {
        return {result: [rootIdentityFundsUtxo]};
      }

      if (addresses[0] === 'rpc-identity-address') {
        return {result: []};
      }

      return {result: [rootFeeUtxo, rootTokenUtxo, rootIdentityUtxo]};
    });
    mockGetIdentity.mockImplementation(async (_systemId, identityAddress) => ({
      result: {
        status: 'active',
        txid: `${identityAddress}-txid`,
        vout: 0,
        fullyqualifiedname:
          identityAddress === 'rpc-identity-address'
            ? 'Brain782.valuid@'
            : 'gift@',
        identity: {
          identityaddress: identityAddress,
          minimumsignatures: 1,
          name:
            identityAddress === 'rpc-identity-address'
              ? 'Brain782'
              : 'gift',
          parent:
            identityAddress === 'rpc-identity-address'
              ? 'valuid-system'
              : mockRootCoin.system_id,
          primaryaddresses:
            identityAddress === 'rpc-identity-address'
              ? ['RStaleClaimAddress']
              : [mockRootClaimAddress],
        },
      },
    }));
    mockEndpoints[mockRootCoin.system_id].getIdentitiesWithAddress.mockResolvedValue({
      result: [
        {
          identityaddress: 'rpc-identity-address',
          minimumsignatures: 1,
          name: 'Brain782',
          primaryaddresses: [mockRootClaimAddress],
          txout: {
            txid: '66'.repeat(32),
            voutnum: 0,
          },
        },
      ],
    });

    const claimPlan = await discoverSpendableKeyClaims({
      mnemonic: 'seed words',
      requestIsTestnet: false,
      activeCoinsForUser: [mockPbaasCoin, mockBtcCoin, mockEthCoin],
    });
    const rootSystem = claimPlan.systems.find(
      system => system.systemId === mockRootCoin.system_id,
    );
    const pbaasSystem = claimPlan.systems.find(
      system => system.systemId === mockPbaasCoin.system_id,
    );

    expect(claimPlan.hasClaims).toBe(true);
    expect(claimPlan.systems).toHaveLength(2);
    expect(rootSystem.currencies.map(currency => currency.currencyId)).toEqual(
      expect.arrayContaining([
        mockRootCoin.system_id,
        'token-system',
        rootIdentityTokenCurrencyId,
      ]),
    );
    expect(
      rootSystem.currencies.find(
        currency => currency.currencyId === mockRootCoin.system_id,
      ),
    ).toEqual(
      expect.objectContaining({
        satoshis: '50000',
        amount: '0.0005',
      }),
    );
    expect(
      rootSystem.currencies.find(
        currency => currency.currencyId === rootIdentityTokenCurrencyId,
      ),
    ).toEqual(
      expect.objectContaining({
        satoshis: '25000000',
        amount: '0.25',
      }),
    );
    expect(rootSystem.identities).toHaveLength(2);
    expect(
      rootSystem.identities.map(identity => identity.identityAddress),
    ).toEqual(
      expect.arrayContaining([
        mockClaimedIdentityAddress,
        'rpc-identity-address',
      ]),
    );
    expect(
      rootSystem.identities.find(
        identity => identity.identityAddress === mockClaimedIdentityAddress,
      ).utxos,
    ).toEqual([rootIdentityFundsUtxo]);
    expect(
      rootSystem.identities.find(
        identity => identity.identityAddress === 'rpc-identity-address',
      ).utxos,
    ).toEqual([]);
    expect(
      rootSystem.identities.find(
        identity => identity.identityAddress === 'rpc-identity-address',
      ).result,
    ).toEqual(
      expect.objectContaining({
        txid: '66'.repeat(32),
        vout: 0,
      }),
    );
    expect(
      rootSystem.identities.find(
        identity => identity.identityAddress === 'rpc-identity-address',
      ).fullyQualifiedName,
    ).toBe('Brain782.valuid@');
    expect(
      rootSystem.identities.find(
        identity => identity.identityAddress === 'rpc-identity-address',
      ).result.identity.primaryaddresses,
    ).toEqual([mockRootClaimAddress]);
    expect(pbaasSystem.currencies[0].currencyId).toBe(mockPbaasCoin.system_id);
    expect(mockGetAddressUtxos).toHaveBeenCalledWith(
      mockRootCoin.system_id,
      [mockRootClaimAddress],
      true,
    );
    expect(
      mockEndpoints[mockRootCoin.system_id].getIdentitiesWithAddress,
    ).toHaveBeenCalledWith({address: mockRootClaimAddress, unspent: true});
    expect(mockGetIdentity).toHaveBeenCalledWith(
      mockRootCoin.system_id,
      'rpc-identity-address',
    );
    expect(mockFindCoinObj).not.toHaveBeenCalledWith('.btc', null, true);
    expect(mockFindCoinObj).not.toHaveBeenCalledWith('.eth', null, true);
  });

  it('does not show native funds that will be consumed by identity fees', async () => {
    mockUnpackOutput.mockImplementation(
      (output, _systemId, _isInput, allowNonTransferEvals) => {
        if (output.script.toString('hex') !== 'ff') return {};
        if (!allowNonTransferEvals) throw new Error('identity output');

        return {
          master: {
            eval: 14,
            data: {
              toJson: () => ({
                identityaddress: mockClaimedIdentityAddress,
                minimumsignatures: 1,
                name: 'gift',
                primaryaddresses: [mockRootClaimAddress],
              }),
            },
          },
        };
      },
    );
    mockGetAddressUtxos.mockImplementation(async (systemId, addresses) => {
      if (systemId === mockPbaasCoin.system_id) {
        return {result: []};
      }

      if (addresses[0] === mockClaimedIdentityAddress) {
        return {result: []};
      }

      return {result: [rootExactFeeUtxo, rootIdentityUtxo]};
    });

    const claimPlan = await discoverSpendableKeyClaims({
      mnemonic: 'seed words',
      requestIsTestnet: false,
      activeCoinsForUser: [],
    });
    const rootSystem = claimPlan.systems.find(
      system => system.systemId === mockRootCoin.system_id,
    );

    expect(claimPlan.hasClaims).toBe(true);
    expect(rootSystem.identities).toHaveLength(1);
    expect(rootSystem.currencies).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({currencyId: mockRootCoin.system_id}),
      ]),
    );
  });

  it('reuses cached discovered systems and scans only newly active systems', async () => {
    const cachedRootSystem = {
      systemId: mockRootCoin.system_id,
      coinObj: mockRootCoin,
      claimAddress: mockRootClaimAddress,
      claimWif: 'cached-root-wif',
      utxos: [rootFeeUtxo],
      currencies: [
        {
          currencyId: mockRootCoin.system_id,
          satoshis: '20000',
          amount: '0.0002',
          display: {
            currencyId: mockRootCoin.system_id,
            name: 'VRSC',
            definition: null,
          },
        },
      ],
      identities: [],
    };

    mockGetAddressUtxos.mockImplementation(async systemId => ({
      result: systemId === mockPbaasCoin.system_id ? [pbaasUtxo] : [],
    }));

    const claimPlan = await discoverSpendableKeyClaims({
      mnemonic: 'seed words',
      requestIsTestnet: false,
      activeCoinsForUser: [mockPbaasCoin],
      cachedSystems: [cachedRootSystem],
    });

    expect(claimPlan.systems).toHaveLength(2);
    expect(
      claimPlan.systems.find(
        system => system.systemId === mockRootCoin.system_id,
      ),
    ).toEqual(cachedRootSystem);
    expect(
      claimPlan.systems.find(
        system => system.systemId === mockPbaasCoin.system_id,
      ).currencies[0].currencyId,
    ).toBe(mockPbaasCoin.system_id);
    expect(mockDeriveKeyPair).toHaveBeenCalledTimes(1);
    expect(mockDeriveKeyPair.mock.calls[0][1]).toBe(mockPbaasCoin);
    expect(mockGetAddressUtxos).toHaveBeenCalledWith(
      mockPbaasCoin.system_id,
      [mockPbaasClaimAddress],
      true,
    );
    expect(mockGetAddressUtxos).not.toHaveBeenCalledWith(
      mockRootCoin.system_id,
      [mockRootClaimAddress],
      true,
    );
  });

  it('does not scan bridged vETH systems as spendable-key systems', async () => {
    const claimPlan = await discoverSpendableKeyClaims({
      mnemonic: 'seed words',
      requestIsTestnet: false,
      activeCoinsForUser: [mockVethAssetCoin],
    });

    expect(claimPlan.systems).toHaveLength(1);
    expect(claimPlan.systems[0].systemId).toBe(mockRootCoin.system_id);
    expect(mockFindCoinObj).not.toHaveBeenCalledWith(
      mockVethAssetCoin.system_id,
      null,
      true,
    );
  });

  it('rejects unsupported multisig identities during preflight', async () => {
    await expect(
      preflightSpendableKeyClaim({
        claimPlan: {
          requestIsTestnet: false,
          systems: [
            {
              systemId: mockRootCoin.system_id,
              coinObj: mockRootCoin,
              utxos: [rootFeeUtxo],
              identities: [
                {
                  unsupportedReason: 'Identity requires multiple signatures.',
                },
              ],
            },
          ],
        },
        destinationBySystem: {
          [mockRootCoin.system_id]: mockDestinationAddress,
        },
      }),
    ).rejects.toThrow('multiple signatures');
  });

  it('requires native fee funds to sweep non-native assets', async () => {
    await expect(
      preflightSpendableKeyClaim({
        claimPlan: {
          requestIsTestnet: false,
          systems: [
            {
              systemId: mockRootCoin.system_id,
              coinObj: mockRootCoin,
              utxos: [rootTokenUtxo],
              identities: [],
            },
          ],
        },
        destinationBySystem: {
          [mockRootCoin.system_id]: mockDestinationAddress,
        },
      }),
    ).rejects.toThrow('no native funds');
  });

  it('uses the higher sweep fee when claiming non-native assets', async () => {
    mockTxInputsByHex['funded-sweep'] = [
      inputForUtxo(rootFeeUtxo),
      inputForUtxo(rootTokenUtxo),
      inputForUtxo(rootSecondTokenUtxo),
    ];

    await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [rootFeeUtxo, rootTokenUtxo, rootSecondTokenUtxo],
            identities: [],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
    });

    expect(mockEndpoints[mockRootCoin.system_id].fundRawTransaction).toHaveBeenCalledWith(
      'unfunded-sweep',
      expect.arrayContaining([
        {txid: rootFeeUtxo.txid, voutnum: rootFeeUtxo.outputIndex},
        {txid: rootTokenUtxo.txid, voutnum: rootTokenUtxo.outputIndex},
        {txid: rootSecondTokenUtxo.txid, voutnum: rootSecondTokenUtxo.outputIndex},
      ]),
      mockDestinationAddress,
      0.0002,
    );
    expect(mockCreateUnfundedCurrencyTransferTransaction).toHaveBeenCalledWith(
      mockRootCoin.system_id,
      [
        expect.objectContaining({
          currencies: expect.objectContaining({
            [rootTokenCurrencyId]: '150000000',
            [rootSecondTokenCurrencyId]: '200000000',
          }),
        }),
      ],
      1100,
    );
  });

  it('rejects standalone sweeps that exceed the planned native fee', async () => {
    mockValidateFundedCurrencyTransfer.mockReturnValueOnce({
      valid: true,
      fees: {
        [mockRootCoin.system_id]: '10001',
      },
    });

    await expect(
      preflightSpendableKeyClaim({
        claimPlan: {
          requestIsTestnet: false,
          systems: [
            {
              systemId: mockRootCoin.system_id,
              coinObj: mockRootCoin,
              claimWif: 'claim-wif',
              utxos: [rootFeeUtxo, rootSweepUtxo],
              identities: [],
            },
          ],
        },
        destinationBySystem: {
          [mockRootCoin.system_id]: mockDestinationAddress,
        },
      }),
    ).rejects.toThrow('Fee exceeds maximum spendable key claim fee.');
  });

  it('requires the higher native fee for non-native asset sweeps', async () => {
    const smallNativeUtxo = makeUtxo({
      txid: '88'.repeat(32),
      outputIndex: 0,
      satoshis: 10000,
      currencyvalues: {
        [mockRootCoin.system_id]: '0.0001',
      },
    });

    await expect(
      preflightSpendableKeyClaim({
        claimPlan: {
          requestIsTestnet: false,
          systems: [
            {
              systemId: mockRootCoin.system_id,
              coinObj: mockRootCoin,
              claimWif: 'claim-wif',
              utxos: [smallNativeUtxo, rootTokenUtxo],
              identities: [],
            },
          ],
        },
        destinationBySystem: {
          [mockRootCoin.system_id]: mockDestinationAddress,
        },
      }),
    ).rejects.toThrow('does not contain enough native funds');
  });

  it('rejects empty spendable keys during preflight', async () => {
    await expect(
      preflightSpendableKeyClaim({
        claimPlan: {
          requestIsTestnet: false,
          systems: [
            {
              systemId: mockRootCoin.system_id,
              coinObj: mockRootCoin,
              utxos: [],
              identities: [],
            },
          ],
        },
        destinationBySystem: {
          [mockRootCoin.system_id]: mockDestinationAddress,
        },
      }),
    ).rejects.toThrow('No claimable transparent funds or VerusIDs');
  });

  it('sets the wallet private address on every claimed identity when requested', async () => {
    const secondExactFeeUtxo = makeUtxo({
      txid: '10'.repeat(32),
      outputIndex: 6,
      satoshis: 10000,
      currencyvalues: {
        [mockRootCoin.system_id]: '0.0001',
      },
    });

    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [rootExactFeeUtxo, secondExactFeeUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                result: {
                  blockheight: 20,
                },
              },
              {
                identityAddress: 'iSecondClaimedIdentityAddress',
                fullyQualifiedName: 'second@',
                result: {
                  blockheight: 21,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
      privateAddressBySystem: {
        [mockRootCoin.system_id]: mockPrivateAddress,
      },
    });

    expect(plan.transactions).toHaveLength(2);
    expect(mockCreateUpdateIdentityTxWithUtxos).toHaveBeenCalledTimes(2);
    const updateIdentity =
      mockCreateUpdateIdentityTxWithUtxos.mock.calls[0][0].identity;

    expect(updateIdentity.setPrimaryAddresses).toHaveBeenCalledTimes(2);
    expect(updateIdentity.setPrimaryAddresses).toHaveBeenCalledWith([
      mockDestinationAddress,
    ]);
    expect(updateIdentity.setPrivateAddress).toHaveBeenCalledTimes(2);
    expect(updateIdentity.setPrivateAddress).toHaveBeenCalledWith(
      mockPrivateAddress,
    );
  });

  it('sets private addresses only on systems with a provided wallet private address', async () => {
    const rootUpdateIdentity = {
      setPrimaryAddresses: jest.fn(),
      setPrivateAddress: jest.fn(),
      toBuffer: jest.fn(() => Buffer.from('dd', 'hex')),
    };
    const pbaasUpdateIdentity = {
      setPrimaryAddresses: jest.fn(),
      setPrivateAddress: jest.fn(),
      toBuffer: jest.fn(() => Buffer.from('ee', 'hex')),
    };
    const pbaasExactFeeUtxo = makeUtxo({
      txid: '12'.repeat(32),
      outputIndex: 0,
      satoshis: 10000,
      currencyvalues: {
        [mockPbaasCoin.system_id]: '0.0001',
      },
    });

    mockGetUpdatableIdentity.mockImplementation(async systemId => ({
      tx: `raw-id-tx-${systemId}`,
      identity:
        systemId === mockPbaasCoin.system_id
          ? pbaasUpdateIdentity
          : rootUpdateIdentity,
    }));

    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'root-claim-wif',
            utxos: [rootExactFeeUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                result: {
                  blockheight: 20,
                },
              },
            ],
          },
          {
            systemId: mockPbaasCoin.system_id,
            coinObj: mockPbaasCoin,
            claimWif: 'pbaas-claim-wif',
            utxos: [pbaasExactFeeUtxo],
            identities: [
              {
                identityAddress: 'iPbaasClaimedIdentityAddress',
                fullyQualifiedName: 'pbaasgift@',
                result: {
                  blockheight: 22,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
        [mockPbaasCoin.system_id]: mockDestinationAddress,
      },
      privateAddressBySystem: {
        [mockRootCoin.system_id]: mockPrivateAddress,
      },
    });

    const updateCalls = mockCreateUpdateIdentityTxWithUtxos.mock.calls.map(
      ([args]) => args,
    );

    expect(plan.transactions).toHaveLength(2);
    expect(updateCalls).toHaveLength(2);
    expect(rootUpdateIdentity.setPrimaryAddresses).toHaveBeenCalledWith([
      mockDestinationAddress,
    ]);
    expect(rootUpdateIdentity.setPrivateAddress).toHaveBeenCalledWith(
      mockPrivateAddress,
    );
    expect(pbaasUpdateIdentity.setPrimaryAddresses).toHaveBeenCalledWith([
      mockDestinationAddress,
    ]);
    expect(pbaasUpdateIdentity.setPrivateAddress).not.toHaveBeenCalled();
    expect(updateCalls.find(args => args.systemId === mockRootCoin.system_id))
      .toEqual(expect.objectContaining({identity: rootUpdateIdentity}));
    expect(updateCalls.find(args => args.systemId === mockPbaasCoin.system_id))
      .toEqual(expect.objectContaining({identity: pbaasUpdateIdentity}));
  });

  it('leaves identity private addresses unchanged when no private address is requested', async () => {
    await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [rootExactFeeUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                result: {
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
    });

    const updateIdentity =
      mockCreateUpdateIdentityTxWithUtxos.mock.calls[0][0].identity;

    expect(updateIdentity.setPrimaryAddresses).toHaveBeenCalledWith([
      mockDestinationAddress,
    ]);
    expect(updateIdentity.setPrivateAddress).not.toHaveBeenCalled();
  });

  it('removes an existing identity private address when the wallet has no z-address', async () => {
    const existingPrivateAddress = {toAddressString: () => 'zs1giftprivateaddress'};
    const updateIdentity = {
      privateAddresses: [existingPrivateAddress],
      setPrimaryAddresses: jest.fn(),
      setPrivateAddress: jest.fn(),
      toBuffer: jest.fn(() => Buffer.from('dd', 'hex')),
    };

    mockGetUpdatableIdentity.mockResolvedValue({
      tx: 'raw-id-tx',
      identity: updateIdentity,
    });

    await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [rootExactFeeUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                result: {
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
      privateAddressBySystem: {
        [mockRootCoin.system_id]: null,
      },
    });

    expect(updateIdentity.setPrimaryAddresses).toHaveBeenCalledWith([
      mockDestinationAddress,
    ]);
    expect(updateIdentity.setPrivateAddress).not.toHaveBeenCalled();
    expect(updateIdentity.privateAddresses).toEqual([]);
    expect(
      mockCreateUpdateIdentityTxWithUtxos.mock.calls[0][0].identity,
    ).toBe(updateIdentity);
  });

  it('combines an identity update with native funds and sends funds to the claimed VerusID', async () => {
    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [rootFeeUtxo, rootSweepUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                result: {
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
    });

    expect(plan.transactions).toHaveLength(1);
    expect(plan.transactions[0]).toEqual(
      expect.objectContaining({
        type: 'identity',
        txHex: 'combined-identity-sweep',
        includesSweep: true,
      }),
    );
    expect(mockCreateUpdateIdentityTxWithUtxos).not.toHaveBeenCalled();
    expect(mockCreateUpdateIdentityWithCurrencyTransferTx).toHaveBeenCalledWith(
      expect.objectContaining({
        changeAaddr: mockDestinationAddress,
        expectedIdentityPrimaryAddress: mockDestinationAddress,
        currencyTransferOutputs: [
          expect.objectContaining({
            currencies: expect.objectContaining({
              [mockRootCoin.system_id]: '50000',
            }),
          }),
        ],
        maxFee: 0.0002,
      }),
    );

    const combinedOutput =
      mockCreateUpdateIdentityWithCurrencyTransferTx.mock.calls[0][0]
        .currencyTransferOutputs[0];

    expect(combinedOutput.address.getAddressString()).toBe(
      mockClaimedIdentityAddress,
    );
    expect(combinedOutput.address.isIAddr()).toBe(true);
  });

  it('sets the wallet private address on combined identity and sweep claims', async () => {
    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [rootFeeUtxo, rootSweepUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                result: {
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
      privateAddressBySystem: {
        [mockRootCoin.system_id]: mockPrivateAddress,
      },
    });

    expect(plan.transactions).toHaveLength(1);
    expect(plan.transactions[0]).toEqual(
      expect.objectContaining({
        type: 'identity',
        includesSweep: true,
      }),
    );

    const updateIdentity =
      mockCreateUpdateIdentityWithCurrencyTransferTx.mock.calls[0][0].identity;

    expect(updateIdentity.setPrimaryAddresses).toHaveBeenCalledWith([
      mockDestinationAddress,
    ]);
    expect(updateIdentity.setPrivateAddress).toHaveBeenCalledWith(
      mockPrivateAddress,
    );
  });

  it('combines the last identity update with the sweep when assets would otherwise be left without native fees', async () => {
    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [rootTokenUtxo, rootFeeUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                result: {
                  txid: '77'.repeat(32),
                  vout: 0,
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
    });

    expect(plan.transactions).toHaveLength(1);
    expect(plan.transactions[0]).toEqual(
      expect.objectContaining({
        type: 'identity',
        txHex: 'combined-identity-sweep',
        includesSweep: true,
      }),
    );
    expect(plan.transactions[0].inputs).toEqual([
      rootFeeUtxo,
      rootTokenUtxo,
      expect.objectContaining({
        txid: '77'.repeat(32),
        outputIndex: 0,
        script: 'aa',
      }),
    ]);
    expect(mockCreateUpdateIdentityTxWithUtxos).not.toHaveBeenCalled();
    expect(mockCreateUpdateIdentityWithCurrencyTransferTx).toHaveBeenCalledWith(
      expect.objectContaining({
        systemId: mockRootCoin.system_id,
        changeAaddr: mockDestinationAddress,
        expectedIdentityPrimaryAddress: mockDestinationAddress,
        rawIdTx: 'raw-id-tx',
        idHeight: 20,
        currencyTransferOutputs: [
          expect.objectContaining({
            currencies: expect.objectContaining({
              [rootTokenCurrencyId]: expect.any(String),
            }),
          }),
        ],
        utxos: [rootTokenUtxo, rootFeeUtxo],
        maxFee: 0.0002,
        isTestnet: false,
      }),
    );
    const combinedOutput =
      mockCreateUpdateIdentityWithCurrencyTransferTx.mock.calls[0][0]
        .currencyTransferOutputs[0];

    expect(combinedOutput.address.getAddressString()).toBe(
      mockClaimedIdentityAddress,
    );
    expect(combinedOutput.address.isIAddr()).toBe(true);
  });

  it('combines identity and asset funds even when there are enough native funds for a separate sweep', async () => {
    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [rootFeeUtxo, rootSweepUtxo, rootTokenUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                result: {
                  txid: '77'.repeat(32),
                  vout: 0,
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
    });

    expect(plan.transactions).toHaveLength(1);
    expect(plan.transactions[0]).toEqual(
      expect.objectContaining({
        type: 'identity',
        txHex: 'combined-identity-sweep',
        includesSweep: true,
      }),
    );
    expect(mockCreateUpdateIdentityTxWithUtxos).not.toHaveBeenCalled();
    expect(mockCreateUpdateIdentityWithCurrencyTransferTx).toHaveBeenCalledWith(
      expect.objectContaining({
        changeAaddr: mockDestinationAddress,
        expectedIdentityPrimaryAddress: mockDestinationAddress,
        currencyTransferOutputs: [
          expect.objectContaining({
            currencies: expect.objectContaining({
              [mockRootCoin.system_id]: '50000',
              [rootTokenCurrencyId]: '150000000',
            }),
          }),
        ],
        maxFee: 0.0002,
      }),
    );

    const combinedOutput =
      mockCreateUpdateIdentityWithCurrencyTransferTx.mock.calls[0][0]
        .currencyTransferOutputs[0];

    expect(combinedOutput.address.getAddressString()).toBe(
      mockClaimedIdentityAddress,
    );
    expect(combinedOutput.address.isIAddr()).toBe(true);
  });

  it('uses ID-held native funds to pay identity update fees when the R-address has none', async () => {
    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                utxos: [rootIdentityFeeUtxo],
                result: {
                  txid: '77'.repeat(32),
                  vout: 0,
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
    });

    expect(plan.transactions).toHaveLength(1);
    expect(mockCreateUpdateIdentityWithCurrencyTransferTx).not.toHaveBeenCalled();
    expect(mockCreateUpdateIdentityTxWithUtxos).toHaveBeenCalledWith(
      expect.objectContaining({
        changeAaddr: mockClaimedIdentityAddress,
        utxos: [rootIdentityFeeUtxo],
        maxFee: 0.0001,
      }),
    );
    expect(plan.transactions[0].outputs).toEqual([
      {
        currencyId: mockRootCoin.system_id,
        satoshis: '10000',
        amount: '0.0001',
      },
      {
        currencyId: 'identity-fee-token-system',
        satoshis: '25000000',
        amount: '0.25',
      },
    ]);

    expect(plan.transactions[0]).toEqual(
      expect.objectContaining({
        type: 'identity',
        txHex: 'identity-hex',
      }),
    );
  });

  it('uses ID-held native funds as the fee source for combined identity and asset claims', async () => {
    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [rootTokenUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                utxos: [rootIdentityNonNativeFeeUtxo],
                result: {
                  txid: '77'.repeat(32),
                  vout: 0,
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
    });

    expect(plan.transactions).toHaveLength(1);
    expect(plan.transactions[0]).toEqual(
      expect.objectContaining({
        type: 'identity',
        txHex: 'combined-identity-sweep',
        includesSweep: true,
      }),
    );
    expect(mockCreateUpdateIdentityTxWithUtxos).not.toHaveBeenCalled();
    expect(mockCreateUpdateIdentityWithCurrencyTransferTx).toHaveBeenCalledWith(
      expect.objectContaining({
        changeAaddr: mockClaimedIdentityAddress,
        expectedIdentityPrimaryAddress: mockDestinationAddress,
        currencyTransferOutputs: [
          expect.objectContaining({
            currencies: expect.objectContaining({
              [mockRootCoin.system_id]: '10000',
              [rootTokenCurrencyId]: '150000000',
            }),
          }),
        ],
        utxos: [rootTokenUtxo, rootIdentityNonNativeFeeUtxo],
        maxFee: 0.0002,
      }),
    );
    expect(plan.transactions[0].outputs).toEqual(
      expect.arrayContaining([
        {
          currencyId: rootTokenCurrencyId,
          satoshis: '150000000',
          amount: '1.5',
        },
        {
          currencyId: mockRootCoin.system_id,
          satoshis: '10000',
          amount: '0.0001',
        },
      ]),
    );

    const output =
      mockCreateUpdateIdentityWithCurrencyTransferTx.mock.calls[0][0]
        .currencyTransferOutputs[0];

    expect(output.address.getAddressString()).toBe(mockClaimedIdentityAddress);
    expect(output.address.isIAddr()).toBe(true);
  });

  it('uses ID-held native funds for the identity update when combined sweep fees are not covered', async () => {
    const smallNativeUtxo = makeUtxo({
      txid: 'de'.repeat(32),
      outputIndex: 0,
      satoshis: 5000,
      currencyvalues: {
        [mockRootCoin.system_id]: '0.00005',
      },
    });
    const identityExactFeeUtxo = makeUtxo({
      txid: 'ef'.repeat(32),
      outputIndex: 1,
      satoshis: 10000,
      currencyvalues: {
        [mockRootCoin.system_id]: '0.0001',
      },
      isspendable: false,
    });

    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [smallNativeUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                utxos: [identityExactFeeUtxo],
                result: {
                  txid: '77'.repeat(32),
                  vout: 0,
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
    });

    expect(plan.transactions).toHaveLength(1);
    expect(mockCreateUpdateIdentityWithCurrencyTransferTx).not.toHaveBeenCalled();
    expect(mockCreateUpdateIdentityTxWithUtxos).toHaveBeenCalledWith(
      expect.objectContaining({
        changeAaddr: mockClaimedIdentityAddress,
        utxos: [identityExactFeeUtxo],
        maxFee: 0.0001,
      }),
    );
    expect(plan.transactions[0].outputs).toEqual([]);
  });

  it('uses ID-held native funds for combined native sweeps when they cover the combined fee', async () => {
    const smallNativeUtxo = makeUtxo({
      txid: 'da'.repeat(32),
      outputIndex: 0,
      satoshis: 5000,
      currencyvalues: {
        [mockRootCoin.system_id]: '0.00005',
      },
    });
    const identityCombinedFeeUtxo = makeUtxo({
      txid: 'eb'.repeat(32),
      outputIndex: 1,
      satoshis: 20000,
      currencyvalues: {
        [mockRootCoin.system_id]: '0.0002',
      },
      isspendable: false,
    });

    const plan = await preflightSpendableKeyClaim({
      claimPlan: {
        requestIsTestnet: false,
        systems: [
          {
            systemId: mockRootCoin.system_id,
            coinObj: mockRootCoin,
            claimWif: 'claim-wif',
            utxos: [smallNativeUtxo],
            identities: [
              {
                identityAddress: mockClaimedIdentityAddress,
                fullyQualifiedName: 'gift@',
                utxos: [identityCombinedFeeUtxo],
                result: {
                  txid: '77'.repeat(32),
                  vout: 0,
                  blockheight: 20,
                },
              },
            ],
          },
        ],
      },
      destinationBySystem: {
        [mockRootCoin.system_id]: mockDestinationAddress,
      },
    });

    expect(plan.transactions).toHaveLength(1);
    expect(mockCreateUpdateIdentityTxWithUtxos).not.toHaveBeenCalled();
    expect(mockCreateUpdateIdentityWithCurrencyTransferTx).toHaveBeenCalledWith(
      expect.objectContaining({
        changeAaddr: mockClaimedIdentityAddress,
        expectedIdentityPrimaryAddress: mockDestinationAddress,
        currencyTransferOutputs: [
          expect.objectContaining({
            currencies: expect.objectContaining({
              [mockRootCoin.system_id]: '5000',
            }),
          }),
        ],
        utxos: [smallNativeUtxo, identityCombinedFeeUtxo],
        maxFee: 0.0002,
      }),
    );
    expect(plan.transactions[0].outputs).toEqual([
      {
        currencyId: mockRootCoin.system_id,
        satoshis: '5000',
        amount: '0.00005',
      },
    ]);
  });

  it('broadcasts identity updates and locally signed sweeps', async () => {
    const result = await broadcastSpendableKeyClaim({
      preflightPlan: {
        transactions: [
          {
            type: 'identity',
            systemId: mockRootCoin.system_id,
            txHex: 'identity-hex',
            inputs: [rootFeeUtxo],
            keys: [['claim-wif']],
          },
          {
            type: 'sweep',
            systemId: mockRootCoin.system_id,
            txHex: 'funded-sweep',
            inputs: [rootSweepUtxo],
            claimWif: 'claim-wif',
          },
        ],
      },
    });

    expect(mockPushUpdateIdentityTx).toHaveBeenCalledWith(
      mockRootCoin.system_id,
      'identity-hex',
      [rootFeeUtxo],
      [['claim-wif']],
    );
    expect(mockFromWIF).toHaveBeenCalledWith('claim-wif', {});
    expect(mockSendRawTransaction).toHaveBeenCalledWith(
      mockRootCoin.system_id,
      'signed-sweep',
    );
    expect(result.results.map(tx => tx.txid)).toEqual([
      'identity-txid',
      'sweep-txid',
    ]);
  });

  it('keeps submitted txids on broadcast errors after partial success', async () => {
    mockSendRawTransaction.mockResolvedValueOnce({
      error: {message: 'sweep failed'},
    });

    let error;

    try {
      await broadcastSpendableKeyClaim({
        preflightPlan: {
          transactions: [
            {
              type: 'identity',
              systemId: mockRootCoin.system_id,
              txHex: 'identity-hex',
              inputs: [rootFeeUtxo],
              keys: [['claim-wif']],
            },
            {
              type: 'sweep',
              systemId: mockRootCoin.system_id,
              txHex: 'funded-sweep',
              inputs: [rootSweepUtxo],
              claimWif: 'claim-wif',
            },
          ],
        },
      });
    } catch (e) {
      error = e;
    }

    expect(error.message).toBe('sweep failed');
    expect(error.results.map(tx => tx.txid)).toEqual(['identity-txid']);
  });
});
