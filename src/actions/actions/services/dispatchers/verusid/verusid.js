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
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../updates/sessionRequests';

const getOriginatingContext = requestContext => {
  const sessionScope =
    requestContext?.sessionScope ||
    (requestContext?.sessionScoped ? requestContext : null) ||
    captureSessionScope(store.getState());

  return {
    ...(requestContext || {}),
    sessionScope,
  };
};

const assertOriginatingSessionCurrent = requestContext => {
  const context = getOriginatingContext(requestContext);

  if (
    context.signal?.aborted === true ||
    !sessionScopeIsCurrent(store.getState(), context.sessionScope)
  ) {
    const error = new Error(
      'Account changed while VerusID data was being updated.',
    );
    error.code = 'SESSION_CHANGED';
    throw error;
  }

  return context;
};

const getOriginatingAccountHash = requestContext => {
  const context = assertOriginatingSessionCurrent(requestContext);
  const accountHash = context.sessionScope.accountHash;

  if (accountHash == null) {
    throw new Error('You must be signed in for VerusID functions');
  }

  return {accountHash, context};
};

export const linkVerusId = async (iAddress, fqn, chain, requestContext) => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertOriginatingSessionCurrent(context);
  const currentLinkedIdentities =
    serviceData.linked_ids == null ? {} : serviceData.linked_ids;

  assertOriginatingSessionCurrent(context);
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
    accountHash,
    context,
  );
};

export const unlinkVerusId = async (iAddress, chain, requestContext) => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertOriginatingSessionCurrent(context);
  let currentLinkedIdentities =
    serviceData.linked_ids == null ? {} : serviceData.linked_ids;

  if (currentLinkedIdentities[chain]) {
    delete currentLinkedIdentities[chain][iAddress];
  }

  assertOriginatingSessionCurrent(context);
  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      linked_ids: currentLinkedIdentities,
    },
    VERUSID_SERVICE_ID,
    accountHash,
    context,
  );
};

export const setRequestedVerusId = async (
  iAddress,
  provisioningDetails,
  chain,
  requestContext,
) => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertOriginatingSessionCurrent(context);
  const currentPendingIdentities =
    serviceData.pending_ids == null ? {} : serviceData.pending_ids;

  assertOriginatingSessionCurrent(context);
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
    accountHash,
    context,
  );
};

export const deleteProvisionedIds = async (
  iAddress,
  chain,
  requestContext,
) => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertOriginatingSessionCurrent(context);
  const currentPendingIdentities =
    serviceData.pending_ids == null ? {} : serviceData.pending_ids;

  if (currentPendingIdentities[chain]) {
    delete currentPendingIdentities[chain][iAddress];
  }

  assertOriginatingSessionCurrent(context);
  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      pending_ids: currentPendingIdentities,
    },
    VERUSID_SERVICE_ID,
    accountHash,
    context,
  );
};

export const deleteAllProvisionedIds = async requestContext => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertOriginatingSessionCurrent(context);

  assertOriginatingSessionCurrent(context);
  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      pending_ids: {},
    },
    VERUSID_SERVICE_ID,
    accountHash,
    context,
  );
};

export const checkVerusIdNotificationsForUpdates = async requestContext => {
  const context = assertOriginatingSessionCurrent(requestContext);
  const state = store.getState();
  const accountHash = context.sessionScope.accountHash;
  const assertCurrent = () => assertOriginatingSessionCurrent(context);

  const getPotentialPrimaryAddresses = async (coinObj, channel) => {

    let addresses = [];
    try {addresses = state.authentication.activeAccount.keys[coinObj.id].vrpc.addresses;}
    catch (e) {}

    return addresses;
  };

  if (state.authentication.activeAccount == null || accountHash == null) {
    throw new Error('You must be signed in for ID provisioning functions');
  }
  const isTestnet = Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0;

  const system = isTestnet ? coinsList.VRSCTEST : coinsList.VRSC;
  const ticker = system.id;

  // Itterate through all pending IDs and check for updates
  const pendingIds = Object.entries(
    state.channelStore_verusid.pendingIds || {},
  ).reduce((allPending, [chain, ids]) => {
    allPending[chain] = Object.entries(ids || {}).reduce(
      (pendingForChain, [identityAddress, details]) => {
        pendingForChain[identityAddress] = {...details};
        return pendingForChain;
      },
      {},
    );
    return allPending;
  }, {});

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertCurrent();
  const currentLinkedIdentities =  Object.keys(serviceData.linked_ids && serviceData.linked_ids[ticker] || {});
  if (pendingIds[ticker]) {
    const details = Object.keys(pendingIds[ticker]);
    for (const iaddress of details) {
      assertCurrent();
      
      // once an ID is linked, remove it from pending IDs, or if the server has rejected it delete.
      if (pendingIds[ticker][iaddress].status === NOTIFICATION_TYPE_VERUSID_READY) {
        if (currentLinkedIdentities.indexOf(iaddress) > -1 || pendingIds[ticker][iaddress].status === NOTIFICATION_TYPE_VERUSID_FAILED) {
          await deleteProvisionedIds(iaddress, ticker, context);
          assertCurrent();
          await updatePendingVerusIds(context);
          assertCurrent();
          await dispatchRemoveNotification(pendingIds[ticker][iaddress].notificationUid);
          assertCurrent();
        }
        continue;
      } 
        
        if ((pendingIds[ticker][iaddress].createdAt + 600) < Math.floor(Date.now() / 1000) &&
              pendingIds[ticker][iaddress].status !== NOTIFICATION_TYPE_VERUSID_READY) {
          // If the request is older than 10 minutes, check info endpoint to see if it was accepted or rejected
        let errorFound = false;
        try {
          if (pendingIds[ticker][iaddress].infoUri) {
            
            const response = await axios.get(
              pendingIds[ticker][iaddress].infoUri,
              context.signal ? {signal: context.signal} : undefined,
            );
            assertCurrent();
            const responseData = new primitives.LoginConsentProvisioningResponse(response.data);
            const requestType = pendingIds[ticker][iaddress].requestType || 'loginconsent';
            let signingId = pendingIds[ticker][iaddress].signingId || null;

            if (requestType === 'loginconsent') {
              const req = new primitives.LoginConsentRequest();
              req.fromBuffer(Buffer.from(pendingIds[ticker][iaddress].loginRequest, 'base64'));
              signingId = req.signing_id;
            }

            const verified = await verifyIdProvisioningResponse(system, response.data);
            assertCurrent();

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
                accountHash,
                null,
                null,
                pendingIds[ticker][iaddress].requestType || 'loginconsent'
              ); 
              await deleteProvisionedIds(iaddress, ticker, context);
              assertCurrent();
              await updatePendingVerusIds(context);
              assertCurrent();
              newVerusIdProvisioningNotification.icon = NOTIFICATION_ICON_ERROR;
              assertCurrent();
              dispatchAddNotification(newVerusIdProvisioningNotification);
              continue;
            }
          } 
        } catch (e) {
          // A session change is not a provisioning/network failure. Re-assert
          // here so it escapes without mutating the newly active account.
          assertCurrent();

          if ((pendingIds[ticker][iaddress].createdAt + 1200) < Math.floor(Date.now() / 1000) &&
                pendingIds[ticker][iaddress].status !== NOTIFICATION_TYPE_VERUSID_ERROR) {

            assertCurrent();
            pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_VERUSID_ERROR;
            pendingIds[ticker][iaddress].error_desc = [`${pendingIds[ticker][iaddress].provisioningName}@`, ` connection error. Provisioning status unknown.`]
            pendingIds[ticker][iaddress].createdAt = Math.floor(Date.now() / 1000) + 1200;
            await setRequestedVerusId(
              iaddress,
              pendingIds[ticker][iaddress],
              ticker,
              context,
            );
            assertCurrent();
            await updatePendingVerusIds(context);
            assertCurrent();
            errorFound = true;
          }
        } 

        if (errorFound) {
          const newBasicNotification = new BasicNotification (
            "",
            pendingIds[ticker][iaddress].error_desc,
            null,
            accountHash
          );  
          newBasicNotification.icon = NOTIFICATION_ICON_ERROR;
          newBasicNotification.uid = pendingIds[ticker][iaddress].notificationUid;
          assertCurrent();
          dispatchAddNotification(newBasicNotification);
          continue;
        }
        
      }

      const identity = await getIdentity(system.system_id, iaddress);
      assertCurrent();
      const addrs = await getPotentialPrimaryAddresses(system);
      assertCurrent();
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

        assertCurrent();
        pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_VERUSID_READY;

        await setRequestedVerusId(
          iaddress,
          pendingIds[ticker][iaddress],
          ticker,
          context,
        );
        assertCurrent();
        await updatePendingVerusIds(context);
        assertCurrent();

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
          accountHash,
          pendingIds[ticker][iaddress].fqn,
          null,
          requestType
        ); 

        newVerusIdProvisioningNotification.icon = NOTIFICATION_ICON_VERUSID;
        assertCurrent();
        dispatchAddNotification(newVerusIdProvisioningNotification);
      }
    }
  }
};

export const clearOldPendingVerusIds = async requestContext => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  const serviceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertOriginatingSessionCurrent(context);
  const currentPendingIdentities = Object.entries(
    serviceData.pending_ids || {},
  ).reduce((allPending, [chain, ids]) => {
    allPending[chain] = {...(ids || {})};
    return allPending;
  }, {});

  const chainObjects = Object.keys(currentPendingIdentities);

  for (const chain of chainObjects) {
    const ids = Object.keys(currentPendingIdentities[chain] || {});
    for (const id of ids) {
      assertOriginatingSessionCurrent(context);
      if ((currentPendingIdentities[chain][id].createdAt + 604800) < Math.floor(Date.now() / 1000)) {
        delete currentPendingIdentities[chain][id];
      }
    }
  }

  assertOriginatingSessionCurrent(context);
  return await modifyServiceStoredDataForUser(
    {
      ...serviceData,
      pending_ids: currentPendingIdentities,
    },
    VERUSID_SERVICE_ID,
    accountHash,
    context,
  );
};
