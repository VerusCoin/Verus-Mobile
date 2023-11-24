import { primitives } from "verusid-ts-client"
import { getIdentity } from "../../verusid/callCreators";
import { waitForTransactionConfirm } from "./getTransaction";
import { verifyIdProvisioningResponse } from "./verifyIdProvisioningResponse";
import { URL } from 'react-native-url-polyfill';
import base64url from "base64url";

export const handleProvisioningResponse = async (
  coinObj,
  responseJson,
  pendingsLeft = 5,
  saveIdentity = async (address, fqn) => {}
) => {
  let _pendingsLeft = 5

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

  if (state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_FAILED.vdxfid)
    throw new Error(error_desc);
  else if (
    state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_COMPLETE.vdxfid ||
    state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_PENDINGAPPROVAL.vdxfid
  ) {
    if (
      pendingsLeft <= 0 &&
      state ===
        primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_PENDINGAPPROVAL.vdxfid
    )
    {  throw new Error('Expected failiure or success, got pending');
    
    }
    // Find transfer or registration txid
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

      if (getIdRes.error) throw new Error(getIdRes.error.message)
      else if (getIdRes.result) {
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