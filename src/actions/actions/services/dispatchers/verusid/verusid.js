import store from '../../../../../store';
import axios from "axios";
import { requestServiceStoredData } from '../../../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../../../utils/constants/services';
import { modifyServiceStoredDataForUser } from '../services';
import { coinsList } from '../../../../../utils/CoinData/CoinsList';
import { getIdentity } from "../../../../../utils/api/channels/verusid/callCreators";
import { primitives } from 'verusid-ts-client';
import { NOTIFICATION_TYPE_VERUSID_READY, NOTIFICATION_TYPE_VERUSID_ERROR, NOTIFICATION_TYPE_VERUSID_FAILED } from '../../../../../utils/constants/services';
import { NOTIFICATION_ICON_ERROR, NOTIFICATION_ICON_VERUSID } from '../../../../../utils/constants/notifications';
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
  const pendingIds = state.channelStore_verusid.pendingIds;

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  const currentLinkedIdentities = Object.keys(serviceData?.linked_ids[ticker] || []);


  if (pendingIds[ticker] !== null) {

    const details = Object.keys(pendingIds[ticker]);
    for (const iaddress of details) {

      // once an ID is linked, remove it from pending IDs, or if the server has rejected it delete.
      if((pendingIds[ticker][iaddress].status === NOTIFICATION_TYPE_VERUSID_READY && 
         currentLinkedIdentities.indexOf(iaddress) > -1) ||(pendingIds[ticker][iaddress].status === NOTIFICATION_TYPE_VERUSID_FAILED)  ) {
          await deleteProvisionedIds(iaddress, ticker);
          await updatePendingVerusIds();
          continue;
      } 

      if ((pendingIds[ticker][iaddress].createdAt + 600) < Math.floor(Date.now() / 1000)) {
        // If the request is older than 10 minutes, check info endpoint to see if it was accepted or rejected
        let errorFound = false;
        try {
          if (pendingIds[ticker][iaddress].infoUri) {
            const response = await axios.post(pendingIds[ticker][iaddress].infoUri);

            if (response.data.result.state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_FAILED.vdxfid) {
              pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_VERUSID_FAILED;
              pendingIds[ticker][iaddress].error_desc = response.data.result.error_desc;
              await setRequestedVerusId(iaddress, pendingIds[ticker][iaddress], ticker);
              await updatePendingVerusIds();
              errorFound = true;
            }
          } 
        } catch (e) {

          if ((pendingIds[ticker][iaddress].createdAt + 1200) < Math.floor(Date.now() / 1000) &&
                pendingIds[ticker][iaddress].status !== NOTIFICATION_TYPE_VERUSID_ERROR) {

            pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_VERUSID_ERROR;
            pendingIds[ticker][iaddress].error_desc = "ID Server connection error."
            pendingIds[ticker][iaddress].createdAt = Math.floor(Date.now() / 1000) + 1200;
            await setRequestedVerusId(iaddress, pendingIds[ticker][iaddress], ticker);
            await updatePendingVerusIds();
            errorFound = true;
          }
        } 

        if (errorFound) {
          const newDeepLinkNotification = new BasicNotification (
            "",
            pendingIds[ticker][iaddress].error_desc,
            null,
            state.authentication.activeAccount.accountHash
          );  
          newDeepLinkNotification.icon = NOTIFICATION_ICON_ERROR;

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

        newDeepLinkNotification.icon = NOTIFICATION_ICON_VERUSID;

        await dispatchAddNotification(newDeepLinkNotification);
      }
    }
  }


};