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
import {markNewAssetChoices} from '../assets/assetChoicesStorage';

export const buildProfileSeeds = (seed, includeDlightSeed = false) => {
  const seeds = {[ELECTRUM]: seed};

  if (includeDlightSeed) {
    seeds[DLIGHT_PRIVATE] = seed;
  }

  return seeds;
};

// The coins a new wallet starts with, in key order: VRSC, BTC and ETH, or
// VRSCTEST and GETH for a testnet wallet (BTC has no testnet coin).
export const getStartingCoinIds = (testProfile = false) =>
  START_COINS.filter(
    coinId => !testProfile || TEST_PROFILE_OVERRIDES[coinId] != null,
  ).map(coinId => ({
    startId: coinId,
    coinId: testProfile ? TEST_PROFILE_OVERRIDES[coinId] : coinId,
  }));

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
  walletAvatar = null,
  // The caller can report this after its setup screen has closed.
  onBiometrySetupFailed = () => {},
  // Called after each finished step: {type: 'key', coinId} per start coin,
  // then 'encrypted', 'assets', 'biometrics' (only with biometrics) and
  // 'opened'. It may return a promise; setup waits for it, so the wallet
  // setup screen can show each step before the next one blocks the thread.
  onStep = () => {},
}) => {
  const seeds = buildProfileSeeds(seed, includeDlightSeed);
  const accountHash = hashAccountId(profileName);

  // Checked before the slow key work, so a taken name fails at once.
  if (accounts.find(x => x.accountHash === accountHash) != null) {
    throw new Error('Cannot create duplicate account.');
  }

  try {
    for (const startCoin of START_COINS) {
      await deriveKeyPair(
        seed,
        CoinDirectory.findCoinObj(startCoin),
        ELECTRUM,
        KEY_DERIVATION_VERSION,
      );
      await onStep({type: 'key', coinId: startCoin});
    }
  } catch (e) {
    throw new Error(`Could not create keypair from recovery secret: ${e.message}`);
  }

  if (seeds[ELECTRUM] == null) {
    throw new Error('Please configure a primary recovery secret.');
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
    walletAvatar,
  );

  dispatch(action);
  await onStep({type: 'encrypted'});
  await addStartingCoins({
    accountId: profileName,
    activeCoinList,
    dispatch,
    testnetOverrides: overrides,
  });
  await onStep({type: 'assets'});

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
    } catch {
      // Password login remains available when biometric setup cannot finish.
      console.warn('Biometric setup did not finish.');
      onBiometrySetupFailed();
    }
    await onStep({type: 'biometrics'});
  }

  markNewAssetChoices(accountHash);
  await initializeAccountData(newAccount, password);
  await onStep({type: 'opened'});

  return newAccount;
};
