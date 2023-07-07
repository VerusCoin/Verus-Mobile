import {
  MOCK_USER_OBJ
} from '../../../tests/helpers/MockAuthData'
import { CoinDirectory } from '../../CoinData/CoinDirectory'
import { ANDROMEDA, QG_ANDROMEDA, SERVICE_ON_VRSCTEST } from '../../../tests/helpers/ChainDefinitions'
import { coinsList } from '../../CoinData/CoinsList';

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
    expect(coinObj.vrpc_endpoints).toContain('170.187.172.176:10004')
    expect(coinObj.seconds_per_block).toBe(60)

    expect(systemObj).toBeDefined()
    expect(systemObj.id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.currency_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.system_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.display_name).toBe('Andromeda')
    expect(systemObj.display_ticker).toBe('Andromeda')
    expect(systemObj.vrpc_endpoints).toContain('170.187.172.176:10004')
    expect(systemObj.seconds_per_block).toBe(60)
  })

  it('can create coinObj for pbaas currency QG on Andromeda', async () => {
    await CoinDirectory.addPbaasCurrency(QG_ANDROMEDA, true, false)
    const coinObj = CoinDirectory.findCoinObj(QG_ANDROMEDA.currencyid, MOCK_USER_OBJ.id)
    const systemObj = CoinDirectory.findSystemCoinObj(coinObj.id)

    expect(coinObj).toBeDefined()
    expect(coinObj.id).toBe('iFuqNPE9HuhqWyD1DghMGmVF1Tn7QSd5zz')
    expect(coinObj.currency_id).toBe('iFuqNPE9HuhqWyD1DghMGmVF1Tn7QSd5zz')
    expect(coinObj.system_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(coinObj.display_name).toBe('QG.Andromeda')
    expect(coinObj.display_ticker).toBe('QG.Andromeda')
    expect(coinObj.vrpc_endpoints).toContain('170.187.172.176:10004')
    expect(coinObj.seconds_per_block).toBe(60)

    expect(systemObj).toBeDefined()
    expect(systemObj.id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.currency_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.system_id).toBe('iNC9NG5Jqk2tqVtqfjfiSpaqxrXaFU6RDu')
    expect(systemObj.display_name).toBe('Andromeda')
    expect(systemObj.display_ticker).toBe('Andromeda')
    expect(systemObj.vrpc_endpoints).toContain('170.187.172.176:10004')
    expect(systemObj.seconds_per_block).toBe(60)
  })
})