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

jest.mock('verusid-ts-client', () => ({
  VerusIdInterface: {
    createUnfundedCurrencyTransferTransaction: mockCreateUnfundedCurrencyTransferTransaction,
  },
}));

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

import {
  broadcastSpendableKeyClaim,
  discoverSpendableKeyClaims,
  preflightSpendableKeyClaim,
} from '../../spendableKey/spendableKey';

const makeUtxo = ({
  txid,
  outputIndex = 0,
  satoshis = 0,
  currencyvalues,
  script = '00',
}) => ({
  txid,
  outputIndex,
  satoshis,
  currencyvalues,
  isspendable: true,
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
});
const rootSweepUtxo = makeUtxo({
  txid: '22'.repeat(32),
  outputIndex: 1,
  satoshis: 50000,
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
        toBuffer: jest.fn(() => Buffer.from('dd', 'hex')),
      },
    });
    mockCreateUpdateIdentityTxWithUtxos.mockResolvedValue({
      hex: 'identity-hex',
      utxos: [rootFeeUtxo],
    });
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
                identityaddress: 'identity-address',
                minimumsignatures: 1,
                name: 'gift',
                primaryaddresses: [mockRootClaimAddress],
              }),
            },
          },
        };
      },
    );
    mockGetAddressUtxos.mockImplementation(async systemId => ({
      result:
        systemId === mockPbaasCoin.system_id
          ? [pbaasUtxo]
          : [rootFeeUtxo, rootTokenUtxo, rootIdentityUtxo],
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
      expect.arrayContaining([mockRootCoin.system_id, 'token-system']),
    );
    expect(rootSystem.identities).toHaveLength(2);
    expect(rootSystem.identities.map(identity => identity.identityAddress)).toEqual(
      expect.arrayContaining(['identity-address', 'rpc-identity-address']),
    );
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

  it('requires the higher native fee for non-native asset sweeps', async () => {
    const smallNativeUtxo = makeUtxo({
      txid: '88'.repeat(32),
      outputIndex: 0,
      satoshis: 10000,
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

  it('preflights identity updates before sweeping remaining UTXOs', async () => {
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
                identityAddress: 'identity-address',
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

    expect(plan.transactions.map(tx => tx.type)).toEqual(['identity', 'sweep']);
    expect(mockCreateUpdateIdentityTxWithUtxos).toHaveBeenCalledWith(
      expect.objectContaining({
        utxos: [rootFeeUtxo],
        changeAaddr: mockDestinationAddress,
        maxFee: 0.0001,
      }),
    );
    expect(plan.transactions[1].inputs).toEqual([rootSweepUtxo]);
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
                identityAddress: 'identity-address',
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
        rawIdTx: 'raw-id-tx',
        idHeight: 20,
        currencyTransferOutputs: [
          expect.objectContaining({
            currencies: expect.objectContaining({
              [mockRootCoin.system_id]: expect.any(String),
              [rootTokenCurrencyId]: expect.any(String),
            }),
          }),
        ],
        utxos: [rootTokenUtxo, rootFeeUtxo],
        maxFee: 0.0002,
        isTestnet: false,
      }),
    );
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
