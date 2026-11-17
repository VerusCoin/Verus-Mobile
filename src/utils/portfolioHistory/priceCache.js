import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'portfolioMarketHistory:v1';
let stored;
let load;
let queue = Promise.resolve();
let generation = 0;
const hourly = new Map();
const pending = new Map();

export const mergeSamples = (...lists) => [...new Map(lists.flat().map((p) => [p[0], p])).values()]
  .sort((a, b) => a[0] - b[0]);

const read = async () => {
  if (!load) {
    load = AsyncStorage.getItem(KEY).then((value) => {
      stored = value ? JSON.parse(value) : {};
      return stored;
    }).catch((error) => {
      load = undefined;
      throw error;
    });
  }
  return load;
};
const persist = () => {
  const next = queue.then(() => AsyncStorage.setItem(KEY, JSON.stringify(stored)));
  queue = next.catch(() => {});
  return next;
};

// Store only public samples. Balance amounts and account hashes never enter this cache.
// A successful daily/hourly request is reused for its whole clock period.
export const cachedHistory = async ({
  key, start, end, stamp, memory = false, oncePerPeriod = false, fetchSamples, canFetch,
}) => {
  const entries = memory ? hourly : await read();
  const get = () => (memory ? entries.get(key) : entries[key]);
  const entry = get();
  if (entry?.stamp === stamp && (oncePerPeriod || entry.from <= start)) return entry.samples;
  if (!canFetch()) return entry?.samples || [];
  if (pending.has(key)) return pending.get(key);
  const version = generation;
  const promise = (async () => {
    const from = entry && entry.from <= start ? Math.max(start, entry.through) : start;
    const samples = await fetchSamples(from, end);
    if (!samples.length) throw new Error('Price history returned no usable samples.');
    const merged = mergeSamples(entry?.samples || [], samples);
    const result = {
      samples: memory ? merged.filter((sample) => sample[0] >= start) : merged,
      from: Math.min(start, entry?.from ?? start),
      through: end,
      stamp,
    };
    if (version === generation) {
      if (memory) entries.set(key, result);
      else {
        entries[key] = result;
        await persist();
      }
    }
    return result.samples;
  })().finally(() => { if (pending.get(key) === promise) pending.delete(key); });
  pending.set(key, promise);
  return promise;
};

// Saved data without a request. Both return undefined until the store is loaded.
export const loadPriceCache = () => read();
export const savedSamples = (keys) => stored
  && mergeSamples(...keys.map((key) => stored[key]?.samples || []));
export const savedNote = (key) => stored?.[key];
// A note is a small public fact beside the samples, such as where a coin's samples are.
export const saveNote = async (key, note) => {
  const entries = await read();
  if (JSON.stringify(entries[key]) === JSON.stringify(note)) return;
  entries[key] = note;
  await persist();
};

export const clearPortfolioPriceCache = async () => {
  generation += 1;
  hourly.clear();
  pending.clear();
  await queue;
  stored = {};
  load = Promise.resolve(stored);
  await AsyncStorage.removeItem(KEY);
};
