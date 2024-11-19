import { ADDRESS_BLOCKLIST_FROM_WEBSERVER, LOADING_ACCOUNT, VALIDATING_ACCOUNT } from "../../../../utils/constants/constants";
import { signIntoAuthenticatedAccount } from "../../../actionCreators";
import { COIN_MANAGER_MAP, fetchActiveCoins, setUserCoins } from "../../coins/Coins";
import {
  activateChainLifecycle,
  activateServiceLifecycle,
  clearServiceIntervals,
  clearChainLifecycle,
} from "../../intervals/dispatchers/lifecycleManager";
import { initPersonalDataForUser } from "../../personal/dispatchers/personal";
import { initServiceStoredDataForUser } from "../../services/dispatchers/services";
import { fetchUsers, validateLogin } from "../../UserData";
import { initSettings, saveGeneralSettings } from "../../WalletSettings";
import { DISABLED_CHANNELS } from '../../../../../env/index'
import store from "../../../../store";
import { getAddressBlocklistFromServer } from "../../../../utils/api/channels/general/addressBlocklist/getAddressBlocklist";

//import { VerusLightClient} from 'react-native-verus-light-client';
import { VerusLightClient} from 'react-native-verus';

export const initializeAccountData = async (
  account,
  password,
  makeDefault = false,
  setInitStep = () => {},
) => {
  setInitStep(VALIDATING_ACCOUNT);
  const accountAuthenticator = await validateLogin(account, password);

  if (accountAuthenticator) {

    VerusLightClient.testReactMethod("Testing successfully!!");
    setInitStep(LOADING_ACCOUNT);
    await initServiceStoredDataForUser(account.accountHash);

    if (makeDefault) {
      await saveGeneralSettings({
        defaultAccount: account.accountHash,
      });
    }

    const coinList = await fetchActiveCoins();
    const setUserCoinsAction = setUserCoins(
      coinList.activeCoinList,
      account.id,
    );
    const {activeCoinsForUser} = setUserCoinsAction.payload;

    const settingsAction = await initSettings()
    store.dispatch(settingsAction);

    try {
      const { addressBlocklist } = store.getState().settings.generalWalletSettings;

      const fetchedBlocklist = await getAddressBlocklistFromServer();
      const currentBlocklist = [];

      for (const address of fetchedBlocklist) {
        currentBlocklist.unshift({ 
          address, 
          details: '', 
          lastModified: Math.floor(Date.now() / 1000) 
        });
      }

      const saveGeneralSettingsAction = await saveGeneralSettings({
        addressBlocklist: currentBlocklist
      });

      store.dispatch(saveGeneralSettingsAction);
    } catch(e) {
      console.warn("Failed to fetch address blocklist");
      console.warn(e);
    }

    store.dispatch(accountAuthenticator);
    store.dispatch(coinList);

    store.dispatch(setUserCoinsAction);

    for (let i = 0; i < activeCoinsForUser.length; i++) {
      const coinObj = activeCoinsForUser[i];

      await Promise.all(
        coinObj.compatible_channels.map(channel => {
          if (
            !DISABLED_CHANNELS.includes(channel) &&
            COIN_MANAGER_MAP.initializers[channel]
          ) {
            return COIN_MANAGER_MAP.initializers[channel](coinObj);
          } else {
            return null;
          }
        }),
      );

      activateChainLifecycle(coinObj, activeCoinsForUser);
    }

    store.dispatch(setUserCoinsAction);

    activateServiceLifecycle();
    await initPersonalDataForUser(account.accountHash);
    store.dispatch(signIntoAuthenticatedAccount());
  } else {
    throw new Error(
      `Failed to validate and initialize account "${account.id}"`,
    );
  }
};


export const clearActiveAccountLifecycles = async () => {
  const state = store.getState();
  const activeCoinsForUser = state.coins.activeCoinsForUser;

  for (let i = 0; i < activeCoinsForUser.length; i++) {
    const coinObj = activeCoinsForUser[i];

    await Promise.all(
      coinObj.compatible_channels.map(channel => {
        if (
          !DISABLED_CHANNELS.includes(channel) &&
          COIN_MANAGER_MAP.closers[channel]
        ) {
          return COIN_MANAGER_MAP.closers[channel](coinObj);
        } else {
          return null;
        }
      }),
    );

    clearChainLifecycle(coinObj.id);
  }

  clearServiceIntervals();
};


export const refreshAccountData = async (
  accountHash,
  password,
  makeDefault = false,
  setInitStep = () => {}
) => {
  await clearActiveAccountLifecycles();
  store.dispatch(await fetchUsers())
  
  const newAccount = store
    .getState()
    .authentication.accounts.find(
      (account) => account.accountHash === accountHash
    );

  return await initializeAccountData(
    newAccount,
    password,
    (makeDefault = false),
    (setInitStep = () => {})
  );
};
