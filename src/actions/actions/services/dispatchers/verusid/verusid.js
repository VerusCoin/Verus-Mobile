import store from '../../../../../store';
import axios from "axios";
import { requestServiceStoredData } from '../../../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../../../utils/constants/services';
import { modifyServiceStoredDataForUser } from '../services';
import { coinsList } from '../../../../../utils/CoinData/CoinsList';
import { getIdentitiesWithAddress, getIdentity } from "../../../../../utils/api/channels/verusid/callCreators";
import { convertFqnToDisplayFormat } from "../../../../../utils/fullyqualifiedname";
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

// Soft cap on how many discovered IDs we auto-link on import. The vast majority
// of users have 1-3 IDs (their personal handle, maybe a sub-ID or two). A cap of
// 5 covers the personal use case comfortably while keeping the import fast, the
// picker UI scannable, and preventing automation / batch-issuance wallets (e.g.
// lottery ticket IDs) from bulk-linking hundreds. Anyone with more IDs is
// already a power user who can link the rest manually from the overview.
const AUTO_DISCOVER_LINK_CAP = 5;

// Discover every VerusID whose primaryaddresses include the wallet's R-address on
// the given system, and bulk-link them under serviceStoredData.linked_ids[coinObj.id].
// Used post-import so the user doesn't have to re-add IDs by hand.
//
// Idempotent: existing linked_ids[coinObj.id] entries are preserved; discovered IDs
// are merged in. Never throws — RPC failures log and return null so callers
// (e.g. createProfileFromSeed) can't have import blocked by a transient endpoint.
export const discoverAndLinkOwnedIds = async (coinObj, walletRAddress) => {
  if (!walletRAddress) return null;

  const state = store.getState();
  if (state.authentication.activeAccount == null) return null;

  let res;
  try {
    res = await getIdentitiesWithAddress(coinObj.system_id, walletRAddress);
  } catch (e) {
    return null;
  }

  if (!res || res.error || !Array.isArray(res.result) || res.result.length === 0) {
    return null;
  }

  // Cap the working set before the per-ID FQN fetches so a batch-issuance wallet
  // doesn't fire hundreds of RPCs at import time.
  const entries = res.result.slice(0, AUTO_DISCOVER_LINK_CAP);

  // `getidentitieswithaddress` returns identity objects directly without the
  // computed `fullyqualifiedname` field that `getidentity` synthesizes (parent
  // chain/ID names included). Follow up per discovered iAddress to fetch the
  // canonical FQN, then apply convertFqnToDisplayFormat so e.g.
  // "bob.bitcoins.VRSC@" becomes the friendly "bob.bitcoins@" used elsewhere.
  // getIdentity is cached, so a refresh later won't re-hit the network.
  const discovered = {};
  for (const entry of entries) {
    const idObj = entry && entry.identity ? entry.identity : entry;
    if (!idObj || !idObj.identityaddress) continue;

    let fqn = null;
    try {
      const idRes = await getIdentity(coinObj.system_id, idObj.identityaddress);
      if (idRes && !idRes.error && idRes.result && idRes.result.fullyqualifiedname) {
        fqn = convertFqnToDisplayFormat(idRes.result.fullyqualifiedname);
      }
    } catch (e) {
      // fall through to name fallback
    }

    discovered[idObj.identityaddress] =
      fqn || (idObj.name ? `${idObj.name}@` : idObj.identityaddress);
  }

  if (Object.keys(discovered).length === 0) return null;

  try {
    const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
    const currentLinkedIdentities =
      serviceData.linked_ids == null ? {} : serviceData.linked_ids;

    return await modifyServiceStoredDataForUser(
      {
        ...serviceData,
        linked_ids: {
          ...currentLinkedIdentities,
          [coinObj.id]: {
            ...(currentLinkedIdentities[coinObj.id] || {}),
            ...discovered,
          },
        },
      },
      VERUSID_SERVICE_ID,
      state.authentication.activeAccount.accountHash,
    );
  } catch (e) {
    return null;
  }
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

    let addresses = [];
    try {addresses = state.authentication.activeAccount.keys[coinObj.id].vrpc.addresses;}
    catch (e) {}

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
            const requestType = pendingIds[ticker][iaddress].requestType || 'loginconsent';
            let signingId = pendingIds[ticker][iaddress].signingId || null;

            if (requestType === 'loginconsent') {
              const req = new primitives.LoginConsentRequest();
              req.fromBuffer(Buffer.from(pendingIds[ticker][iaddress].loginRequest, 'base64'));
              signingId = req.signing_id;
            }

            const verified = await verifyIdProvisioningResponse(system, response.data);

            if (!signingId || responseData.signing_id !== signingId || !verified) {
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
                null,
                pendingIds[ticker][iaddress].requestType || 'loginconsent'
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
            pendingIds[ticker][iaddress].error_desc = [`${pendingIds[ticker][iaddress].provisioningName}@`, ` connection error. Provisioning status unknown.`]
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
      const addrs = await getPotentialPrimaryAddresses(system);
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

        const requestType = pendingIds[ticker][iaddress].requestType || 'loginconsent';
        let hasResponseUris = pendingIds[ticker][iaddress].hasResponseUris;

        if (requestType === 'loginconsent') {
          const req = new primitives.LoginConsentRequest();
          req.fromBuffer(Buffer.from(pendingIds[ticker][iaddress].loginRequest, 'base64'));
          hasResponseUris = req.challenge.redirect_uris && req.challenge.redirect_uris.length > 0;
        }

        const newVerusIdProvisioningNotification = new VerusIdProvisioningNotification (
          hasResponseUris ? "link and login" : "link VerusID",
          [`${identity.result.fullyqualifiedname.substring(0, identity.result.fullyqualifiedname.lastIndexOf('.'))}@`, ` is ready`],
          null,
          pendingIds[ticker][iaddress].notificationUid,
          pendingIds[ticker][iaddress].loginRequest,
          state.authentication.activeAccount.accountHash,
          pendingIds[ticker][iaddress].fqn,
          null,
          requestType
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
