import { primitives } from "verusid-ts-client"
import { getIdentity } from "../../verusid/callCreators";
import { waitForTransactionConfirm } from "./getTransaction";
import { verifyIdProvisioningResponse } from "./verifyIdProvisioningResponse";
import { NOTIFICATION_TYPE_VERUSID_PENDING } from '../../../../constants/notifications';
import { updatePendingVerusIds } from "../../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager"
import { setRequestedVerusId } from '../../../../../actions/actions/services/dispatchers/verusid/verusid';

export const handleProvisioningResponse = async (
  coinObj,
  responseJson,
  loginRequestBase64,
  fromService,
  saveIdentity = async (address, fqn) => {}
) => {

  // Verify response signature
  const verified = await verifyIdProvisioningResponse(coinObj, responseJson);

  if (!verified) throw new Error('Failed to verify response from service');

  const response = new primitives.LoginConsentProvisioningResponse(responseJson);

  const {decision} = response;
  const {result} = decision;
  const {
    error_desc,
    info_uri,
    state,
    provisioning_txids,
    identity_address
  } = result;

  if (state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_FAILED.vdxfid) {
    throw new Error(error_desc);
  } else if (state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_PENDINGAPPROVAL.vdxfid) { 

    // If the response is pending approval, store the pending verus id and it will be
    // checked on an interval until it is approved or rejected
    const verusIdState = {
      status: NOTIFICATION_TYPE_VERUSID_PENDING,
      fqn: result.fully_qualified_name,
      loginRequest: loginRequestBase64,
      fromService: fromService,
      createdAt: Number((Date.now() / 1000).toFixed(0)),
      info_uri: result.info_uri,
      decision_id: decision.decision_id
    }

    await setRequestedVerusId(result.identity_address, verusIdState, coinObj.id);
    await updatePendingVerusIds();

  } else if (state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_COMPLETE.vdxfid) {
    // Find transfer or registration txid of the transfered ID
    // and check for confirmation, then add to wallet ready to login.
    const completeTxid =
      provisioning_txids != null
        ? provisioning_txids.find(x => {
            return (
              x.vdxfkey === primitives.IDENTITY_REGISTRATION_TXID.vdxfid ||
              x.vdxfkey === primitives.IDENTITY_UPDATE_TXID.vdxfid
            );
          })
        : null;

    if (completeTxid) { 
      // Wait for update or registration txid confirm
      await waitForTransactionConfirm(coinObj, completeTxid.data)

      const getIdRes = await getIdentity(coinObj.system_id, identity_address)

      if (getIdRes.error) { 
        throw new Error(getIdRes.error.message) 
      } else if (getIdRes.result) {
        await saveIdentity(getIdRes.result.identity.identityaddress, getIdRes.result.identity.name)
      }

      return
    } else {
      throw new Error('Not enough information to determine provisioning status');
    }
  } else {
    throw new Error('Unsupported provisioning response state');
  }
};