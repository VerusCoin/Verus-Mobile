import {addCoin, addUser} from '../../actions/actionCreators';
import {initializeAccountData} from '../../actions/actionDispatchers';
import {KEY_DERIVATION_VERSION, SERVICES_DISABLED_DEFAULT} from '../../../env/index';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import {START_COINS, TEST_PROFILE_OVERRIDES} from '../constants/constants';
import {CHANNELS, DLIGHT_PRIVATE, ELECTRUM, VERUSID} from '../constants/intervalConstants';
import {hashAccountId} from '../crypto/hash';
import {deriveKeyPair} from '../keys';
import {arrayToObject} from '../objectManip';
import {storeBiometricPassword} from '../keychain/biometrics';
import {discoverAndLinkOwnedIds} from '../../actions/actions/services/dispatchers/verusid/verusid';

export const buildProfileSeeds = (seed, includeDlightSeed = false) => {
  const seeds = {[ELECTRUM]: seed};

  if (includeDlightSeed) {
    seeds[DLIGHT_PRIVATE] = seed;
  }

  return seeds;
};

const addStartingCoins = async ({
  accountId,
  activeCoinList,
  dispatch,
  testnetOverrides = {},
}) => {
  const testAccount = Object.keys(testnetOverrides).length > 0;

  for (const coinId of START_COINS) {
    if (testAccount && testnetOverrides[coinId] == null) {
      continue;
    }

    const coinKey = testnetOverrides[coinId] ? testnetOverrides[coinId] : coinId;
    const fullCoinData = CoinDirectory.findCoinObj(coinKey, accountId);

    dispatch(await addCoin(fullCoinData, activeCoinList, accountId, []));
  }
};

export const createProfileFromSeed = async ({
  profileName,
  password,
  seed,
  accounts,
  activeCoinList,
  dispatch,
  testProfile = false,
  includeDlightSeed = false,
  useBiometrics = false,
}) => {
  const seeds = buildProfileSeeds(seed, includeDlightSeed);

  try {
    for (const startCoin of START_COINS) {
      await deriveKeyPair(
        seed,
        CoinDirectory.findCoinObj(startCoin),
        ELECTRUM,
        KEY_DERIVATION_VERSION,
      );
    }
  } catch (e) {
    throw new Error(`Could not create keypair from seed: ${e.message}`);
  }

  if (seeds[ELECTRUM] == null) {
    throw new Error('Please configure at least a primary seed.');
  }

  const accountHash = hashAccountId(profileName);

  if (accounts.find(x => x.accountHash === accountHash) != null) {
    throw new Error('Cannot create duplicate account.');
  }

  let biometry = false;

  if (useBiometrics) {
    try {
      await storeBiometricPassword(accountHash, password);
      biometry = true;
    } catch (e) {
      console.warn(e);
    }
  }

  const overrides = testProfile ? TEST_PROFILE_OVERRIDES : undefined;
  const action = await addUser(
    profileName,
    arrayToObject(CHANNELS, (acc, channel) => seeds[channel], true),
    password,
    accounts,
    biometry,
    KEY_DERIVATION_VERSION,
    SERVICES_DISABLED_DEFAULT,
    overrides,
  );

  dispatch(action);
  await addStartingCoins({
    accountId: profileName,
    activeCoinList,
    dispatch,
    testnetOverrides: overrides,
  });

  const newAccount = action.payload.accounts.find(
    x => x.accountHash === accountHash,
  );

  if (!newAccount) {
    throw new Error('Failed to create new account');
  }

  await initializeAccountData(newAccount, password);

  // Best-effort: discover and bulk-link any VerusIDs the wallet's R-address already
  // controls on each VerusID-capable start chain. Never fail import on RPC errors —
  // the user can still link manually if discovery doesn't reach the endpoint.
  try {
    const testAccount = overrides != null;
    for (const startCoin of START_COINS) {
      if (testAccount && overrides[startCoin] == null) continue;

      const coinKey = testAccount && overrides[startCoin] ? overrides[startCoin] : startCoin;
      const coinObj = CoinDirectory.findCoinObj(coinKey, profileName);

      if (!coinObj.compatible_channels || !coinObj.compatible_channels.includes(VERUSID)) {
        continue;
      }

      const keyObj = await deriveKeyPair(seed, coinObj, ELECTRUM, KEY_DERIVATION_VERSION);
      const rAddress = keyObj && keyObj.addresses ? keyObj.addresses[0] : null;
      if (!rAddress) continue;

      await discoverAndLinkOwnedIds(coinObj, rAddress);
    }
  } catch (e) {
    // Discovery is best-effort: log and move on.
    // eslint-disable-next-line no-console
    console.warn('Auto-discover of owned VerusIDs failed:', e && e.message);
  }

  return newAccount;
};
