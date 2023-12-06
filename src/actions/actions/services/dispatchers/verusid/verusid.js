import store from '../../../../../store';
import axios from "axios";
import { requestServiceStoredData } from '../../../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../../../utils/constants/services';
import { modifyServiceStoredDataForUser } from '../services';
import { coinsList } from '../../../../../utils/CoinData/CoinsList';
import { getTransaction } from "../../../../../utils/api/channels/vrpc/requests/getTransaction";
import { getInfo } from "../../../../../utils/api/channels/vrpc/requests/getInfo";
import { getIdentity } from "../../../../../utils/api/channels/verusid/callCreators";
import { primitives } from 'verusid-ts-client';
import { NOTIFICATION_TYPE_VERUSID_READY } from '../../../../../utils/constants/notifications';
import { updatePendingVerusIds } from "../../../channels/verusid/dispatchers/VerusidWalletReduxManager"
import { dispatchAddNotification } from '../../../notifications/dispatchers/notifications';
import { DeeplinkNotification, BasicNotification } from '../../../../../utils/notification';

export const linkVerusId = async (iAddress, fqn, chain) => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in to link VerusIDs');
  }

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  const currentLinkedIdentities =
    serviceData.linked_ids == null ? {} : serviceData.linked_ids;

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      linked_ids: {
        ...currentLinkedIdentities,
        [chain]: currentLinkedIdentities[chain]
          ? {
            ...currentLinkedIdentities[chain],
            [iAddress]: fqn,
          }
          : { [iAddress]: fqn },
      },
    },
    VERUSID_SERVICE_ID,
    state.authentication.activeAccount.accountHash,
  );
};

export const unlinkVerusId = async (iAddress, chain) => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in to unlink VerusIDs');
  }

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  let currentLinkedIdentities =
    serviceData.linked_ids == null ? {} : serviceData.linked_ids;

  if (currentLinkedIdentities[chain]) {
    delete currentLinkedIdentities[chain][iAddress];
  }

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      linked_ids: currentLinkedIdentities,
    },
    VERUSID_SERVICE_ID,
    state.authentication.activeAccount.accountHash,
  );
};

export const setRequestedVerusId = async (iAddress, provisioningDetails, chain) => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in for ID provisioning');
  }

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  const currentPendingIdentities =
    serviceData.pending_ids == null ? {} : serviceData.pending_ids;

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      pending_ids: {
        ...currentPendingIdentities,
        [chain]: currentPendingIdentities[chain]
          ? {
            ...currentPendingIdentities[chain],
            [iAddress]: provisioningDetails,
          }
          : { [iAddress]: provisioningDetails },
      },
    },
    VERUSID_SERVICE_ID,
    state.authentication.activeAccount.accountHash,
  );
};

export const deleteProvisionedIds = async (iAddress, chain) => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in for ID provisioning');
  }

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  const currentPendingIdentities =
    serviceData.pending_ids == null ? {} : serviceData.pending_ids;

  if (currentPendingIdentities[chain]) {
    delete currentPendingIdentities[chain][iAddress];
  }

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      pending_ids: currentPendingIdentities,
    },
    VERUSID_SERVICE_ID,
    state.authentication.activeAccount.accountHash,
  );
};

export const deleteAllProvisionedIds = async () => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in for ID provisioning');
  }

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);

  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      pending_ids: {},
    },
    VERUSID_SERVICE_ID,
    state.authentication.activeAccount.accountHash,
  );
};

export const checkVerusIdNotificationsForUpdates = async () => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in for ID provisioning functions');
  }
  const isTestnet = Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0;

  const system = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;
  const ticker = system.id;

  // Itterate through all pending IDs and check for updates
  const pendingIds = state.channelStore_verusid.pendingIds

  if (pendingIds[ticker] !== null) {

    const details = Object.keys(pendingIds[ticker]);
    for (const iaddress of details) {

      if(pendingIds[ticker][iaddress].status === NOTIFICATION_TYPE_VERUSID_READY) continue;

      if ((pendingIds[ticker][iaddress].created_at + 600) < Math.floor(Date.now() / 1000)) {
        // If the request is older than 10 minutes, check info endpoint to see if it was accepted or rejected
        try {
          if (pendingIds[ticker][iaddress].info_uri) {
            const response = await axios.get(pendingIds[ticker][iaddress].info_uri);
           if (response.data.result.state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_FAILED.vdxfid) {
              pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_ERROR;
              pendingIds[ticker][iaddress].error_desc = data.result.error_desc;
              await setRequestedVerusId(iaddress, pendingIds[ticker][iaddress], ticker);
              await updatePendingVerusIds();
            }
          }
        } catch (e) {
              pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_ERROR;
              pendingIds[ticker][iaddress].error_desc = "Server not responding, please try again later"
              await setRequestedVerusId(iaddress, pendingIds[ticker][iaddress], ticker);
              await updatePendingVerusIds();
        } finally {
          const newDeepLinkNotification = new BasicNotification (
            pendingIds[ticker][iaddress].error_desc,
            "Error",
            null,
            state.authentication.activeAccount.accountHash
          );   
          await dispatchAddNotification(newDeepLinkNotification);
          continue;
        }
      }

      const identity = await getIdentity(system.system_id, iaddress);

      if (identity.result &&
        identity.result.identity.primaryaddresses
          .indexOf(state.authentication.activeAccount.keys[ticker].vrpc.addresses[0]) > -1) {

        pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_VERUSID_READY;

        await setRequestedVerusId(iaddress, pendingIds[ticker][iaddress], ticker);
        await linkVerusId(iaddress, identity.result.fullyqualifiedname, ticker);
        await updatePendingVerusIds();

        const newDeepLinkNotification = new DeeplinkNotification (
          "login",
          [`${identity.result.fullyqualifiedname.split(".")[0]}@`, ` is ready`],
          null,
          null,
          pendingIds[ticker][iaddress].loginRequest,
          state.authentication.activeAccount.accountHash
        ); 

        await dispatchAddNotification(newDeepLinkNotification);
      }
    }
  }


};