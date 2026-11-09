import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getElectrumVersions,
  initElectrumCache,
  setElectrumVersion,
  clearCachedVersions,
} from '../../asyncStore/cache/electrumVersions';
import {
  getCachedHeader,
  getHeaderCache,
  initHeaderCache,
  setCachedHeader,
  clearCachedHeaders,
} from '../../asyncStore/cache/blockHeaders';
import {
  clearCachedEthTxReceipts,
  getCachedEthTxReceipt,
  getEthTxReceiptCache,
  initEthTxReceiptCache,
  setCachedEthTxReceipt,
} from '../../asyncStore/cache/ethTxReceipts';
import {
  clearCachedVrpcResponses,
  getAllCachedVrpcResponses,
  getCachedVrpcResponse,
  getVrpcResponseCacheKey,
  initVrpcResponseCache,
  setCachedVrpcResponse,
} from '../../asyncStore/cache/vrpcResponseCache';
import {initCache} from '../../asyncStore/cache/cache';

const systemId = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const endpoint = 'https://rpc.example';
const request = {prepare: () => ({method: 'getinfo', params: []})};
const caches = [
  ['header', initHeaderCache, getHeaderCache, clearCachedHeaders, 'block_header', 'getting all', 'Clearing block header cache'],
  ['electrum', initElectrumCache, getElectrumVersions, clearCachedVersions, 'server_version', 'getting', 'Clearing electrum version cache'],
  ['ethTxReceipt', initEthTxReceiptCache, getEthTxReceiptCache, clearCachedEthTxReceipts, 'eth_tx_receipts', 'getting all', 'Clearing block ethTxReceipt cache'],
  ['vrpc', initVrpcResponseCache, getAllCachedVrpcResponses, clearCachedVrpcResponses, 'vrpc_response', 'getting all', null],
];

describe('persistent cache integrity', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
    await initElectrumCache();
    await initHeaderCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves and reloads react-native-cache double-serialized entries', async () => {
    const header = {hash: 'abc', height: 10};
    await setElectrumVersion('electrum.example:50001', 1.4);
    await setCachedHeader(header, 10, 'VRSC');

    const rawVersion = await AsyncStorage.getItem(
      'server_version:electrum.example|50001',
    );
    // react-native-cache setItem() JSON-serializes its already serialized
    // in-memory entry. Its getAll() consequently returns strings.
    expect(typeof JSON.parse(rawVersion)).toBe('string');

    await initElectrumCache();
    await initHeaderCache();

    expect(await getElectrumVersions()).toMatchObject({
      'electrum.example|50001': {value: 1.4},
    });
    expect(JSON.parse(await getCachedHeader(10, 'VRSC'))).toEqual(header);
  });

  it('clears a corrupt LRU and its entries without discarding valid caches', async () => {
    await setElectrumVersion('electrum.example:50001', 1.4);
    await setCachedHeader({hash: 'abc'}, 10, 'VRSC');
    await AsyncStorage.setItem('block_header:_lru', '{malformed');

    await expect(initCache()).resolves.toBeDefined();

    expect(await getElectrumVersions()).toMatchObject({
      'electrum.example|50001': {value: 1.4},
    });
    expect(await getHeaderCache()).toEqual({});
    expect(await AsyncStorage.getItem('block_header:VRSC.10')).toBeNull();
    expect(await AsyncStorage.getItem('block_header:_lru')).toBe('[]');
  });

  it('clears a corrupt entry referenced by an otherwise valid LRU', async () => {
    await AsyncStorage.multiSet([
      ['block_header:_lru', JSON.stringify(['VRSC.10'])],
      ['block_header:VRSC.10', '{malformed'],
    ]);

    await expect(initCache()).resolves.toBeDefined();

    expect(await getHeaderCache()).toEqual({});
    expect(await AsyncStorage.getItem('block_header:VRSC.10')).toBeNull();
    expect(await AsyncStorage.getItem('block_header:_lru')).toBe('[]');
  });

  it('rejects storage failures instead of treating them as disposable corruption', async () => {
    const storageError = new Error('storage unavailable');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    AsyncStorage.getAllKeys.mockRejectedValueOnce(storageError);

    await expect(initHeaderCache()).rejects.toBe(storageError);
  });

  it('retains receipt hex encoding and the distinct parsed/snapshot VRPC results across reloads', async () => {
    await initCache();
    const receipt = {gasUsed: BigInt(21), cumulativeGasUsed: BigInt(42), status: 1};
    const response = {result: {height: 10}, error: null};
    await setCachedEthTxReceipt(receipt, 'txid');
    await setCachedVrpcResponse(systemId, endpoint, request, response);
    await initCache();

    const encodedReceipt = {gasUsed: '0x15', cumulativeGasUsed: '0x2a', status: 1};
    expect(await getCachedEthTxReceipt('txid')).toEqual(encodedReceipt);
    expect((await getEthTxReceiptCache()).txid.value).toEqual(encodedReceipt);
    expect(await getCachedVrpcResponse(systemId, endpoint, request)).toEqual(response);
    const key = getVrpcResponseCacheKey(systemId, endpoint, request);
    expect((await getAllCachedVrpcResponses())[key].value).toBe(JSON.stringify(response));
    expect(receipt.gasUsed).toBe(BigInt(21));
  });

  it.each(caches)('clears only the %s namespace and retains its clear log', async (
    _name, initialize, getAll, clear, namespace, _getOperation, clearMessage,
  ) => {
    await AsyncStorage.multiSet([
      [`${namespace}:orphan`, 'corrupt'],
      [`${namespace}:_lru`, '{malformed'],
      [`${namespace}_other:keep`, 'untouched'],
    ]);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    await expect(clear()).resolves.toBeUndefined();

    expect(log.mock.calls).toEqual(clearMessage == null ? [] : [[clearMessage]]);
    expect(await AsyncStorage.getItem(`${namespace}:orphan`)).toBeNull();
    expect(await AsyncStorage.getItem(`${namespace}:_lru`)).toBe('[]');
    expect(await AsyncStorage.getItem(`${namespace}_other:keep`)).toBe('untouched');
    await expect(initialize()).resolves.toBeUndefined();
    await expect(getAll()).resolves.toEqual({});
  });

  it.each(caches)('preserves %s lifecycle errors and diagnostic messages', async (
    name, initialize, getAll, clear, _namespace, getOperation, clearMessage,
  ) => {
    const error = new Error('backend unavailable');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    for (const [operation, method] of [
      ['initializing', initialize], [getOperation, getAll], ['clearing', clear],
    ]) {
      log.mockClear();
      AsyncStorage.getAllKeys.mockRejectedValueOnce(error);
      await expect(method()).rejects.toBe(error);
      expect(log.mock.calls).toEqual([
        ...(operation === 'clearing' && clearMessage != null ? [[clearMessage]] : []),
        [`Error while ${operation} ${name} cache`],
      ]);
    }
  });

  it.each([
    ['block_header', initHeaderCache, getHeaderCache, '[]'],
    ['server_version', initElectrumCache, getElectrumVersions, '1.4'],
    ['eth_tx_receipts', initEthTxReceiptCache, getEthTxReceiptCache, []],
    ['vrpc_response', initVrpcResponseCache, getAllCachedVrpcResponses, '{invalid'],
  ])('keeps the %s validator when loading a structurally valid cache entry', async (
    namespace, initialize, getAll, invalidValue,
  ) => {
    await AsyncStorage.multiSet([
      [`${namespace}:_lru`, '["entry"]'],
      [`${namespace}:entry`, JSON.stringify({value: invalidValue})],
    ]);
    await initialize();
    await expect(getAll()).resolves.toEqual({});
    expect(await AsyncStorage.getItem(`${namespace}:entry`)).toBeNull();
  });
});
