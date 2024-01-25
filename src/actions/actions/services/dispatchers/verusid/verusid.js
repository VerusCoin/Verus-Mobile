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
import { VerusIdProvisioningNotification, BasicNotification } from '../../../../../utils/notification';
import {requestSeeds} from '../../../../../utils/auth/authBox';
import {deriveKeyPair} from '../../../../../utils/keys';
import {ELECTRUM} from '../../../../../utils/constants/intervalConstants';
import { dispatchRemoveNotification } from '../../../../actions/notifications/dispatchers/notifications';
import { verifyIdProvisioningResponse } from "../../../../../utils/api/channels/vrpc/requests/verifyIdProvisioningResponse";

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

  const getPotentialPrimaryAddresses = async (coinObj, channel) => {
    const seeds = await requestSeeds();

    const seed = seeds[channel];

    const keyObj = await deriveKeyPair(seed, coinObj, channel);
    const {addresses} = keyObj;

    return addresses;
  };

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in for ID provisioning functions');
  }
  const isTestnet = Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0;

  const system = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;
  const ticker = system.id;

  // Itterate through all pending IDs and check for updates
  const pendingIds = state.channelStore_verusid.pendingIds;

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  const currentLinkedIdentities =  Object.keys(serviceData.linked_ids && serviceData.linked_ids[ticker] || {});

  if (pendingIds[ticker]) {
    const details = Object.keys(pendingIds[ticker]);
    for (const iaddress of details) {
      
      // once an ID is linked, remove it from pending IDs, or if the server has rejected it delete.
      if (pendingIds[ticker][iaddress].status === NOTIFICATION_TYPE_VERUSID_READY) {
        if (currentLinkedIdentities.indexOf(iaddress) > -1 || pendingIds[ticker][iaddress].status === NOTIFICATION_TYPE_VERUSID_FAILED) {
          await deleteProvisionedIds(iaddress, ticker);
          await updatePendingVerusIds();
          await dispatchRemoveNotification(pendingIds[ticker][iaddress].notificationUid);
        }
        continue;
      } 
        
        if ((pendingIds[ticker][iaddress].createdAt + 600) < Math.floor(Date.now() / 1000) &&
              pendingIds[ticker][iaddress].status !== NOTIFICATION_TYPE_VERUSID_READY) {
          // If the request is older than 10 minutes, check info endpoint to see if it was accepted or rejected
        let errorFound = false;
        try {
          if (pendingIds[ticker][iaddress].infoUri) {
            
            const response = await axios.get(pendingIds[ticker][iaddress].infoUri);
            const responseData = new primitives.LoginConsentProvisioningResponse(response.data);
            const req = new primitives.LoginConsentRequest();
            req.fromBuffer(Buffer.from(pendingIds[ticker][iaddress].loginRequest, 'base64'));
            const verified = await verifyIdProvisioningResponse(system, response.data);

            if (responseData.signing_id !== req.signing_id || !verified) {
              throw new Error('Failed to verify response from service');
            }
            
            if (responseData.decision.result.state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_FAILED.vdxfid) {

              const newVerusIdProvisioningNotification = new VerusIdProvisioningNotification (
                "Retry",
                [`${pendingIds[ticker][iaddress].provisioningName.split(".")[0]}@`, ` failed to create identity.`],
                null,
                pendingIds[ticker][iaddress].notificationUid,
                pendingIds[ticker][iaddress].loginRequest,
                state.authentication.activeAccount.accountHash,
                null,
                null
              ); 
              await deleteProvisionedIds(iaddress, ticker);
              await updatePendingVerusIds();
              newVerusIdProvisioningNotification.icon = NOTIFICATION_ICON_ERROR;
              dispatchAddNotification(newVerusIdProvisioningNotification);
              continue;
            }
          } 
        } catch (e) {

          if ((pendingIds[ticker][iaddress].createdAt + 1200) < Math.floor(Date.now() / 1000) &&
                pendingIds[ticker][iaddress].status !== NOTIFICATION_TYPE_VERUSID_ERROR) {

            pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_VERUSID_ERROR;
            pendingIds[ticker][iaddress].error_desc = [`${pendingIds[ticker][iaddress].provisioningName}@`, ` server connection error.`]
            pendingIds[ticker][iaddress].createdAt = Math.floor(Date.now() / 1000) + 1200;
            await setRequestedVerusId(iaddress, pendingIds[ticker][iaddress], ticker);
            await updatePendingVerusIds();
            errorFound = true;
          }
        } 

        if (errorFound) {
          const newBasicNotification = new BasicNotification (
            "",
            pendingIds[ticker][iaddress].error_desc,
            null,
            state.authentication.activeAccount.accountHash
          );  
          newBasicNotification.icon = NOTIFICATION_ICON_ERROR;
          newBasicNotification.uid = pendingIds[ticker][iaddress].notificationUid;
          dispatchAddNotification(newBasicNotification);
          continue;
        }
        
      }

      const identity = await getIdentity(system.system_id, iaddress);
      const addrs = await getPotentialPrimaryAddresses(system, ELECTRUM);
      let isInWallet = false;

      if (identity.result) {
        for (const address of identity.result.identity.primaryaddresses) {
          if (addrs.includes(address)) {
            isInWallet = true;
            break;
          }
        }
      }

      if (isInWallet) {

        pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_VERUSID_READY;

        await setRequestedVerusId(iaddress, pendingIds[ticker][iaddress], ticker);
        await updatePendingVerusIds();

        const newVerusIdProvisioningNotification = new VerusIdProvisioningNotification (
          "link and login",
          [`${identity.result.fullyqualifiedname.substring(0, identity.result.fullyqualifiedname.lastIndexOf('.'))}@`, ` is ready`],
          null,
          pendingIds[ticker][iaddress].notificationUid,
          pendingIds[ticker][iaddress].loginRequest,
          state.authentication.activeAccount.accountHash,
          pendingIds[ticker][iaddress].fqn,
          null
        ); 

        newVerusIdProvisioningNotification.icon = NOTIFICATION_ICON_VERUSID;
        dispatchAddNotification(newVerusIdProvisioningNotification);
      }
    }
  }
};

export const clearOldPendingVerusIds = async () => {
  const state = store.getState();

  if (state.authentication.activeAccount == null) {
    throw new Error('You must be signed in for ID provisioning information');
  }

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  const currentPendingIdentities =
    serviceData.pending_ids == null ? {} : serviceData.pending_ids;

  const chainObjects = Object.keys(currentPendingIdentities);

  for (const chain of chainObjects) {
    const ids = Object.keys(currentPendingIdentities[chain] || {});
    for (const id of ids) {
      if ((currentPendingIdentities[chain][id].createdAt + 604800) < Math.floor(Date.now() / 1000)) {
        delete currentPendingIdentities[chain][id];
      }
    }
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