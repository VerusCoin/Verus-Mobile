import {addCoin, addUser, setBiometry} from '../../actions/actionCreators';
import {initializeAccountData} from '../../actions/actionDispatchers';
import {KEY_DERIVATION_VERSION, SERVICES_DISABLED_DEFAULT} from '../../../env/index';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import {START_COINS, TEST_PROFILE_OVERRIDES} from '../constants/constants';
import {CHANNELS, DLIGHT_PRIVATE, ELECTRUM} from '../constants/intervalConstants';
import {hashAccountId} from '../crypto/hash';
import {deriveKeyPair} from '../keys';
import {arrayToObject} from '../objectManip';
import {storeBiometricPassword} from '../keychain/biometrics';

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

  const overrides = testProfile ? TEST_PROFILE_OVERRIDES : undefined;
  const action = await addUser(
    profileName,
    arrayToObject(CHANNELS, (acc, channel) => seeds[channel], true),
    password,
    accounts,
    false,
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

  let newAccount = action.payload.accounts.find(
    x => x.accountHash === accountHash,
  );

  if (!newAccount) {
    throw new Error('Failed to create new account');
  }

  // Claim the profile in durable storage before touching its biometric
  // credential. A rejected duplicate must never replace an existing password.
  if (useBiometrics) {
    try {
      await storeBiometricPassword(accountHash, password);
      const biometricAction = await setBiometry(accountHash, true);
      dispatch(biometricAction);
      newAccount = biometricAction.payload.accounts.find(
        account => account.accountHash === accountHash,
      );
    } catch (e) {
      // Password login remains available when biometric setup cannot finish.
      console.warn(e);
    }
  }

  await initializeAccountData(newAccount, password);

  return newAccount;
};
