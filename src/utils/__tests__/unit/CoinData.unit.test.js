import {
  MOCK_USER_OBJ
} from '../../../tests/helpers/MockAuthData'
import { CoinDirectory } from '../../CoinData/CoinDirectory'
import { ANDROMEDA, QG_ANDROMEDA, SERVICE_ON_VRSCTEST } from '../../../tests/helpers/ChainDefinitions'
import { coinsList } from '../../CoinData/CoinsList';

jest.mock('../../../../env/index', () => ({
  CURRENCY_DEFINITION_STORAGE_INTERNAL_KEY: 'test-currency-definitions',
  VRPC_API_KEYS: {},
}));

describe('Main coin data functions', () => {
  // Applies only to tests in this describe block
  beforeEach(() => {
    CoinDirectory.coins = JSON.parse(JSON.stringify(coinsList));
    CoinDirectory.updateCoinLists()
  });

  it('can find coin from pre-existing coins list and create coin obj', () => {
    const coinObj = CoinDirectory.findCoinObj('VRSC', MOCK_USER_OBJ.id)

    expect(coinObj).toBeDefined()
    expect(coinObj.id).toBe('VRSC')
    expect(coinObj).toHaveProperty('users')
    expect(coinObj.users).toContain(MOCK_USER_OBJ.id)
    expect(coinObj).toHaveProperty('apps')
    expect(coinObj.apps.wallet).toHaveProperty('data')
    expect(coinObj.seconds_per_block).toBe(60)
  })

  it('can create coinObj for pbaas currency on VRSCTEST', async () => {
    await CoinDirectory.addPbaasCurrency(SERVICE_ON_VRSCTEST, true)
    const coinObj = CoinDirectory.findCoinObj(SERVICE_ON_VRSCTEST.currencyid, MOCK_USER_OBJ.id)
    const systemObj = CoinDirectory.findSystemCoinObj(coinObj.id)

    expect(coinObj).toBeDefined()
    expect(coinObj.id).toBe('iFZC7A1HnnJGwBmoPjX3mG37RKbjZZLPhm')
    expect(coinObj.currency_id).toBe('iFZC7A1HnnJGwBmoPjX3mG37RKbjZZLPhm')
    expect(coinObj.system_id).toBe('iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq')
    expect(coinObj.display_name).toBe('service')
    expect(coinObj.display_ticker).toBe('service')
    expect(coinObj.vrpc_endpoints).toContain('https://api.verustest.net')
    expect(coinObj.seconds_per_block).toBe(60)

    expect(systemObj).toBeDefined()
    expect(systemObj.id).toBe('VRSCTEST')
    expect(systemObj.currency_id).toBe('iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq')
    expect(systemObj.system_id).toBe('iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq')
    expect(systemObj.display_name).toBe('Verus Testnet')
    expect(systemObj.display_ticker).toBe('VRSCTEST')
    expect(systemObj.vrpc_endpoints).toContain('https://api.verustest.net')
    expect(systemObj.seconds_per_block).toBe(60)
  })

  it('can create coinObj for pbaas chain Andromeda', async () => {
    await CoinDirectory.addPbaasCurrency(ANDROMEDA, true, false)
    const coinObj = CoinDirectory.findCoinObj(ANDROMEDA.currencyid, MOCK_USER_OBJ.id)
    const systemObj = CoinDirectory.findSystemCoinObj(coinObj.id)

    expect(coinObj).toBeDefined()
    expect(coinObj.id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(coinObj.currency_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(coinObj.system_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(coinObj.display_name).toBe('Andromeda')
    expect(coinObj.display_ticker).toBe('Andromeda')
    expect(coinObj.vrpc_endpoints).toContain('https://api.verustest.net:10004')
    expect(coinObj.seconds_per_block).toBe(60)

    expect(systemObj).toBeDefined()
    expect(systemObj.id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.currency_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.system_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.display_name).toBe('Andromeda')
    expect(systemObj.display_ticker).toBe('Andromeda')
    expect(systemObj.vrpc_endpoints).toContain('https://api.verustest.net:10004')
    expect(systemObj.seconds_per_block).toBe(60)
  })

  it('can create coinObj for pbaas currency QG on Andromeda', async () => {
    await CoinDirectory.addPbaasCurrency(ANDROMEDA, true, false)
    await CoinDirectory.addPbaasCurrency(QG_ANDROMEDA, true, false)
    const coinObj = CoinDirectory.findCoinObj(QG_ANDROMEDA.currencyid, MOCK_USER_OBJ.id)
    const systemObj = CoinDirectory.findSystemCoinObj(coinObj.id)

    expect(coinObj).toBeDefined()
    expect(coinObj.id).toBe('iFuqNPE9HuhqWyD1DghMGmVF1Tn7QSd5zz')
    expect(coinObj.currency_id).toBe('iFuqNPE9HuhqWyD1DghMGmVF1Tn7QSd5zz')
    expect(coinObj.system_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(coinObj.display_name).toBe('QG.Andromeda')
    expect(coinObj.display_ticker).toBe('QG.Andromeda')
    expect(coinObj.vrpc_endpoints).toContain('https://api.verustest.net:10004')
    expect(coinObj.seconds_per_block).toBe(60)

    expect(systemObj).toBeDefined()
    expect(systemObj.id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.currency_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.system_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.display_name).toBe('Andromeda')
    expect(systemObj.display_ticker).toBe('Andromeda')
    expect(systemObj.vrpc_endpoints).toContain('https://api.verustest.net:10004')
    expect(systemObj.seconds_per_block).toBe(60)
  })
})

describe('Default VRPC endpoints', () => {
  const testnetKeySlot = '204165660a8e26de6d447ae98005825ade4a83f0799fcbab3a0e19d49cbe40c8';

  it.each([
    ['no key map', undefined, 'https://api.verustest.net'],
    ['no host key', {}, 'https://api.verustest.net'],
    ['an empty key', {[testnetKeySlot]: ''}, 'https://api.verustest.net'],
    ['the placeholder', {[testnetKeySlot]: 'V2API_API_KEY'}, 'https://api.verustest.net'],
    ['a configured key', {[testnetKeySlot]: 'TEST_ONLY_V2_API_KEY'}, 'https://v2api.verustest.net'],
    ['a key for another host', {otherHost: 'TEST_ONLY_V2_API_KEY'}, 'https://api.verustest.net'],
  ])('selects the testnet endpoint with %s', (_case, keys, endpoint) => {
    const env = require('../../../../env/index');
    const previousKeys = env.VRPC_API_KEYS;

    try {
      env.VRPC_API_KEYS = keys;

      jest.isolateModules(() => {
        const {coinsList: configuredCoins} = require('../../CoinData/CoinsList');

        expect(configuredCoins.VRSCTEST.vrpc_endpoints).toEqual([endpoint]);
        expect(configuredCoins.VRSC.vrpc_endpoints).toEqual(['https://v2api.verus.services']);
        expect(
          configuredCoins.i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X.vrpc_endpoints,
        ).toEqual(['https://api.verus.services']);
      });
    } finally {
      env.VRPC_API_KEYS = previousKeys;
    }
  });
});
