import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getElectrumVersions,
  initElectrumCache,
  setElectrumVersion,
} from '../../asyncStore/cache/electrumVersions';
import {
  getCachedHeader,
  getHeaderCache,
  initHeaderCache,
  setCachedHeader,
} from '../../asyncStore/cache/blockHeaders';
import {initCache} from '../../asyncStore/cache/cache';

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
});
