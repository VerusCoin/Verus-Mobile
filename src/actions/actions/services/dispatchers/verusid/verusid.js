import store from '../../../../../store';
import axios from "axios";
import { requestServiceStoredData } from '../../../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../../../utils/constants/services';
import { modifyServiceStoredDataForUser } from '../services';
import { coinsList } from '../../../../../utils/CoinData/CoinsList';
import { getIdentity } from "../../../../../utils/api/channels/verusid/callCreators";
import { primitives } from 'verusid-ts-client';
import { convertFqnToDisplayFormat } from '../../../../../utils/fullyqualifiedname';
import { NOTIFICATION_TYPE_VERUSID_READY, NOTIFICATION_TYPE_VERUSID_ERROR, NOTIFICATION_TYPE_VERUSID_FAILED } from '../../../../../utils/constants/services';
import { NOTIFICATION_ICON_ERROR, NOTIFICATION_ICON_VERUSID } from '../../../../../utils/constants/notifications';
import { updatePendingVerusIds } from "../../../channels/verusid/dispatchers/VerusidWalletReduxManager"
import { dispatchAddNotification } from '../../../notifications/dispatchers/notifications';
import { VerusIdProvisioningNotification, BasicNotification } from '../../../../../utils/notification';
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

// Every writer of this encrypted record updates the latest data inside the
// storage queue. Snapshot replacements can erase a concurrently saved reservation.
export const linkVerusId = async (iAddress, fqn, chain, requestContext) => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  return modifyServiceStoredDataForUser(
    current => ({
      ...current,
      linked_ids: {
        ...(current.linked_ids || {}),
        [chain]: {...(current.linked_ids?.[chain] || {}), [iAddress]: convertFqnToDisplayFormat(fqn)},
      },
    }),
    VERUSID_SERVICE_ID,
    accountHash,
    context,
  );
};

export const unlinkVerusId = async (iAddress, chain, requestContext) => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  return modifyServiceStoredDataForUser(
    current => {
      const identities = {...(current.linked_ids?.[chain] || {})};
      delete identities[iAddress];
      return {
        ...current,
        linked_ids: {...(current.linked_ids || {}), [chain]: identities},
      };
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
  // Track accepted provisioning, without retaining a replayable login request.
  const details = {
    status: provisioningDetails.status,
    fqn: provisioningDetails.fqn,
    signingId: provisioningDetails.signingId,
    createdAt: provisioningDetails.createdAt,
    infoUri: provisioningDetails.infoUri,
    provisioningName: provisioningDetails.provisioningName,
    notificationUid: provisioningDetails.notificationUid,
    error_desc: provisioningDetails.error_desc,
  };

  return modifyServiceStoredDataForUser(
    current => ({
      ...current,
      pending_ids: {
        ...(current.pending_ids || {}),
        [chain]: {...(current.pending_ids?.[chain] || {}), [iAddress]: details},
      },
    }),
    VERUSID_SERVICE_ID,
    accountHash,
    context,
  );
};

export const deleteProvisionedIds = async (iAddress, chain, requestContext) => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  return modifyServiceStoredDataForUser(
    current => {
      const identities = {...(current.pending_ids?.[chain] || {})};
      delete identities[iAddress];
      return {
        ...current,
        pending_ids: {...(current.pending_ids || {}), [chain]: identities},
      };
    },
    VERUSID_SERVICE_ID,
    accountHash,
    context,
  );
};

export const deleteAllProvisionedIds = async requestContext => {
  const {accountHash, context} = getOriginatingAccountHash(requestContext);

  return modifyServiceStoredDataForUser(
    current => ({...current, pending_ids: {}}),
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

  const notifyIdentityReady = (identityAddress, fqn, notificationUid) => {
    const displayName = fqn ? convertFqnToDisplayFormat(fqn) : identityAddress;
    const notification = new VerusIdProvisioningNotification(
      'Link VerusID',
      [displayName, ' is ready'],
      notificationUid,
      accountHash,
      identityAddress,
      ticker,
    );
    notification.icon = NOTIFICATION_ICON_VERUSID;
    assertCurrent();
    dispatchAddNotification(notification);
  };

  if (pendingIds[ticker]) {
    const details = Object.keys(pendingIds[ticker]);
    for (const iaddress of details) {
      assertCurrent();
      
      // Once a ready ID is linked, its pending tracking record is no longer needed.
      if (pendingIds[ticker][iaddress].status === NOTIFICATION_TYPE_VERUSID_READY) {
        if (currentLinkedIdentities.indexOf(iaddress) > -1) {
          await deleteProvisionedIds(iaddress, ticker, context);
          assertCurrent();
          await updatePendingVerusIds(context);
          assertCurrent();
          await dispatchRemoveNotification(pendingIds[ticker][iaddress].notificationUid);
          assertCurrent();
        } else {
          const {notificationUid, fqn} = pendingIds[ticker][iaddress];
          const notification = state.notifications?.directory?.[notificationUid];

          // Rebuild an existing ready action from accepted identity metadata.
          // Dismissed notices stay dismissed; original requests are never replayed.
          if (notification &&
              (notification.identityAddress !== iaddress || notification.chain !== ticker)) {
            notifyIdentityReady(iaddress, fqn, notificationUid);
          }
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
            const signingId = pendingIds[ticker][iaddress].signingId;

            const verified = await verifyIdProvisioningResponse(system, response.data);
            assertCurrent();

            if (!signingId || responseData.signing_id !== signingId || !verified) {
              throw new Error('Failed to verify response from service');
            }
            
            if (responseData.decision.result.state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_FAILED.vdxfid &&
                pendingIds[ticker][iaddress].status !== NOTIFICATION_TYPE_VERUSID_FAILED) {

              // A provider failure does not prove the identity was never created.
              // Retain the request and continue checking the chain below. Only
              // report a newly observed failure, so dismissed notices stay dismissed.
              pendingIds[ticker][iaddress].status = NOTIFICATION_TYPE_VERUSID_FAILED;
              pendingIds[ticker][iaddress].error_desc = [
                `${pendingIds[ticker][iaddress].provisioningName.split(".")[0]}@`,
                ' failed to create identity.',
              ];

              const newVerusIdProvisioningNotification = new BasicNotification (
                "Request a new provisioning attempt from the service.",
                pendingIds[ticker][iaddress].error_desc,
                pendingIds[ticker][iaddress].notificationUid,
                accountHash,
              ); 
              await setRequestedVerusId(
                iaddress,
                pendingIds[ticker][iaddress],
                ticker,
                context,
              );
              assertCurrent();
              await updatePendingVerusIds(context);
              assertCurrent();
              newVerusIdProvisioningNotification.icon = NOTIFICATION_ICON_ERROR;
              assertCurrent();
              dispatchAddNotification(newVerusIdProvisioningNotification);
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

        notifyIdentityReady(
          iaddress,
          identity.result.fullyqualifiedname,
          pendingIds[ticker][iaddress].notificationUid,
        );
      }
    }
  }
};
