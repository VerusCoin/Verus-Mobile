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
      throw new Error('Expected failiure or success, got pending');
    else {
      _pendingsLeft--
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
    } else if (info_uri != null) {
      // If no transfer or registration txid, find info web socket
      const url = new URL(info_uri);
      
      if (url.protocol === "ws:" || url.protocol === "wss:") {
        return new Promise((resolve, reject) => {
          try {
            const ws = new WebSocket(url.toString());

            const timeout = setTimeout(() => {
              reject(new Error("Timeout while waiting for websocket connection"))
              ws.close()
            }, 600000)

            ws.onmessage = async (message) => {
              try {
                const messageBuffer = base64url.toBuffer(message.data)
                
                // Make sure data is a valid provisioning response
                const newResponse = new primitives.LoginConsentProvisioningResponse();
                newResponse.fromBuffer(messageBuffer)

                clearTimeout(timeout)

                try {
                  resolve(
                    await handleProvisioningResponse(
                      coinObj,
                      newResponse,
                      _pendingsLeft,
                      saveIdentity,
                    ),
                  );
                } catch(error) {
                  ws.close()
                  reject(error)
                }
              } catch(_e) {
                ws.close()
                reject(_e)
              }
            };

            ws.onerror = (e) => {              
              clearTimeout(timeout)
              reject(e)
              ws.close()
            };
          } catch(e) {
            reject(e)
          }
        })
      } else {
        throw new Error('Non-websocket status protocols currently unsupported')
      }
    } else {
      throw new Error('Not enough information to determine provisioning status');
    }
  } else {
    throw new Error('Unsupported provisioning response state');
  }
};