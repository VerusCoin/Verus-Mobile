import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'balancePrivacy:hidden:v1';
let cached;
let writes = Promise.resolve();

// Read once at module load, alongside the existing startup work. A stalled
// storage read must not hold startup open. Ignore it after the fallback wins.
const read = new Promise(resolve => {
  const finish = showBalance => {
    if (cached === undefined) cached = showBalance;
    resolve();
  };
  const timer = setTimeout(() => finish(true), 400);
  Promise.resolve().then(() => AsyncStorage.getItem(KEY)).then(value => {
    clearTimeout(timer);
    finish(value !== 'true');
  }).catch(() => {
    clearTimeout(timer);
    finish(true);
  });
});

export const readBalanceVisibility = async () => {
  await read;
  return cached;
};

export const saveBalanceVisibility = showBalance => {
  cached = showBalance;
  // Serialize writes so rapid taps leave the last choice on disk. A failed
  // write keeps the session choice and does not stop the next save.
  writes = writes.then(() =>
    AsyncStorage.setItem(KEY, showBalance ? 'false' : 'true'),
  ).catch(() => {});
  return writes;
};
