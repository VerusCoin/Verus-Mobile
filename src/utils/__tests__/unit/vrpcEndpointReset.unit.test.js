const mockDispatch = jest.fn();

jest.mock('verusd-rpc-ts-client', () => ({
  VerusdRpcInterface: class VerusdRpcInterface {},
}));

jest.mock('verusid-ts-client', () => ({
  VerusIdInterface: class VerusIdInterface {},
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
    getState: jest.fn(() => ({
      channelStore_vrpc: {vrpcEndpoints: {}},
    })),
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
const VrpcInterface = require('../../vrpc/vrpcInterface').default;

describe('VRPC global endpoint reset', () => {
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
});
