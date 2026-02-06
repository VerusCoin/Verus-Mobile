import { AuthenticationRequestOrdinalVDXFObject, GenericRequest, GenericResponse } from "verus-typescript-primitives";
import VrpcProvider from '../../vrpc/vrpcInterface';
import { getBlock } from "../../api/channels/vrpc/requests/getBlock";
import { getSignatureInfo } from "../../api/channels/vrpc/requests/getSignatureInfo";
import { getIdentity } from "../../api/channels/verusid/callCreators";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import { getSystemNameFromSystemId } from "../../CoinData/CoinData";
import { convertFqnToDisplayFormat } from "../../fullyqualifiedname";

/**
 * @param {GenericRequest} request
 * @param {GenericResponse} response
 * @param {number} detailIndex
 * @returns {{
 *  displayProps: {
 *    detailsBufferString: string;
 *    sigtime?: number;
 *    signerFqn?: string;
 *    signerSystemID?: string;
 *    signerSystemName?: string;
 *    signerIdentityID?: string;
 *  }
 *  response: GenericResponse;
 *  handledIndices: Array<number>;
 * }}
 */
export const handleAuthenticationRequestDetailsVDXFObject = async (request, response, detailIndex) => {
  /**
   * @type {AuthenticationRequestOrdinalVDXFObject}
   */
  const details = request.getDetails(detailIndex);

  if (details == null) throw new Error("Invalid index for request details");
  if (!(details instanceof AuthenticationRequestOrdinalVDXFObject)) throw new Error("Authentication request details not found at specified index");

  let signerFqn;
  let signerSystemID;
  let signerSystemName;
  let signerIdentityID;
  let sigtime;

  signerSystemID = request.signature.systemID.toIAddress();
  signerIdentityID = request.signature.identityID.toIAddress();
  signerSystemName = getSystemNameFromSystemId(signerSystemID);

  if (signerSystemName) {
    const coinObj = CoinDirectory.getBasicCoinObj(signerSystemName);
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);
    const signedBy = await getIdentity(coinObj.system_id, signerIdentityID);

    if (signedBy.error) throw new Error(signedBy.error.message);
    signerFqn = convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname);

    const sig = await getSignatureInfo(
      coinObj.system_id,
      request.signature.identityID.toIAddress(),
      request.signature.signatureAsVch.toString('base64')
    );
    const sigblock = await getBlock(coinObj.system_id, sig.height);
    if (sigblock.error) throw new Error(sigblock.error.message);
    sigtime = sigblock.result.time;
  } else {
    signerFqn = request.signature.identityID.toIAddress();
  }

  return {
    displayProps: {
      detailsBufferString: details.data.toBuffer().toString('hex'),
      sigtime,
      signerFqn,
      signerSystemID,
      signerSystemName,
      signerIdentityID
    },
    response,
    handledIndices: []
  }
}
