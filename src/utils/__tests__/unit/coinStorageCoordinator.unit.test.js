jest.mock('../../../../env/index', () => ({
  COIN_STORAGE_INTERNAL_KEY: 'coins',
}));

jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {findCoinObj: jest.fn()},
}));

jest.mock('../../keychain/secureStore', () => ({
  SecureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const deferred = () => {
  let resolve;
  const promise = new Promise(resolvePromise => {
    resolve = resolvePromise;
  });
  return {promise, resolve};
};

describe('coin storage Fast Refresh coordinator', () => {
  const coordinatorKey = Symbol.for(
    'verus.mobile.coinStorageMutationCoordinator.v1',
  );

  beforeEach(() => {
    delete globalThis[coordinatorKey];
  });

  afterEach(async () => {
    await globalThis[coordinatorKey]?.queue;
    delete globalThis[coordinatorKey];
  });

  it('serializes mutations created by separate module instances', async () => {
    let firstModule;
    let refreshedModule;
    jest.isolateModules(() => {
      firstModule = require('../../asyncStore/coinStorage');
    });
    jest.isolateModules(() => {
      refreshedModule = require('../../asyncStore/coinStorage');
    });

    const firstGate = deferred();
    const order = [];
    const firstMutation = firstModule.queueCoinStorageMutation(async () => {
      order.push('first-start');
      await firstGate.promise;
      order.push('first-finish');
    });
    const refreshedMutation = refreshedModule.queueCoinStorageMutation(
      async () => {
        order.push('refreshed-start');
      },
    );

    await Promise.resolve();
    expect(order).toEqual(['first-start']);

    firstGate.resolve();
    await Promise.all([firstMutation, refreshedMutation]);
    expect(order).toEqual([
      'first-start',
      'first-finish',
      'refreshed-start',
    ]);
  });
});
