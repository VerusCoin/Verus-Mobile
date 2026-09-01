const mockDispatch = jest.fn();
const mockIdentityFundRawTransaction = jest.fn();
const mockRpcRequest = jest.fn();
const mockStoreState = {
  channelStore_vrpc: {vrpcEndpoints: {}},
};

jest.mock('verusd-rpc-ts-client', () => ({
  VerusdRpcInterface: class VerusdRpcInterface {
    constructor(chain) {
      this.chain = chain;
    }

    request(request) {
      return mockRpcRequest(request);
    }

    fundRawTransaction(txhex, utxos, changeaddr, explicitfee) {
      return this.request({
        cmd: 'fundrawtransaction',
        txhex,
        utxos,
        changeaddr,
        explicitfee,
      });
    }
  },
}));

jest.mock('verusid-ts-client', () => ({
  VerusIdInterface: class VerusIdInterface {
    constructor() {
      this.interface = {
        fundRawTransaction: mockIdentityFundRawTransaction,
      };
    }
  },
}));

jest.mock('verus-typescript-primitives', () => ({
  ApiRequest: class ApiRequest {},
  GetBlockHashRequest: class GetBlockHashRequest {},
}));

jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
}));

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    dispatch: mockDispatch,
    getState: jest.fn(() => mockStoreState),
  },
}));

jest.mock('../../asyncStore/asyncStore', () => ({
  getCachedVrpcResponse: jest.fn(),
  getVrpcResponseCacheKey: jest.fn(),
  setCachedVrpcResponse: jest.fn(),
}));

jest.mock('../../CoinData/CoinsList', () => ({
  coinsList: {
    VRSC: {system_id: 'vrsc-system'},
    VRSCTEST: {system_id: 'vrsctest-system'},
  },
}));

jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {getVrpcEndpoints: jest.fn(() => [])},
}));

jest.mock('../../../../env/index', () => ({
  VRPC_API_APP_ID: undefined,
  VRPC_API_KEYS: {},
}));

const {CLEAR_VRPC_ENDPOINTS} = require('../../constants/storeType');
const {
  FUND_RAW_TRANSACTION_MANY_UTXOS_ERROR,
} = require('../../vrpc/fundRawTransactionError');
const VrpcInterface = require('../../vrpc/vrpcInterface').default;

describe('VRPC global endpoint reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.channelStore_vrpc.vrpcEndpoints = {};
    VrpcInterface.systemEndpointIds = {};
    VrpcInterface.endpointConnections = {};
    VrpcInterface.cacheInterfaces = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears stale connection reference counts with endpoint state', () => {
    VrpcInterface.systemEndpointIds = {system: ['endpoint-id']};
    VrpcInterface.endpointConnections = {'endpoint-id': 4};
    VrpcInterface.cacheInterfaces = {'endpoint-id': {}};

    VrpcInterface.deleteAllEndpoints();

    expect(VrpcInterface.systemEndpointIds).toEqual({});
    expect(VrpcInterface.endpointConnections).toEqual({});
    expect(VrpcInterface.cacheInterfaces).toEqual({});
    expect(mockDispatch).toHaveBeenCalledWith({
      type: CLEAR_VRPC_ENDPOINTS,
    });
  });

  it('preserves large-wallet funding errors from the VerusID client', async () => {
    const systemId = 'system';
    const endpoint = 'https://example.com';
    const utxos = Array.from({length: 501}, (_, index) => ({
      txid: String(index),
      voutnum: 0,
    }));
    const args = ['raw-transaction', utxos, 'change'];

    mockRpcRequest.mockResolvedValue({
      error: {code: -32601, message: 'Method not found'},
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    VrpcInterface.saveChainEndpoint(systemId, endpoint);
    const [endpointId] = VrpcInterface.systemEndpointIds[systemId];

    mockStoreState.channelStore_vrpc.vrpcEndpoints[endpointId] = [
      systemId,
      endpoint,
    ];

    const verusIdInterface = VrpcInterface.getVerusIdInterface(systemId);
    await expect(verusIdInterface.interface.fundRawTransaction(...args))
      .rejects.toMatchObject({
        code: FUND_RAW_TRANSACTION_MANY_UTXOS_ERROR,
        utxoCount: 501,
      });

    expect(mockRpcRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        cmd: 'fundrawtransaction',
        utxos,
      }),
    );
    expect(mockIdentityFundRawTransaction).not.toHaveBeenCalled();
  });
});
