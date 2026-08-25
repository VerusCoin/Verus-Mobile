import { getIdentity } from "../../api/channels/verusid/callCreators";
import { getBlock } from "../../api/channels/vrpc/requests/getBlock";
import { getSignatureInfo } from "../../api/channels/vrpc/requests/getSignatureInfo";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import { getSystemNameFromSystemId } from "../../CoinData/CoinData";
import { convertFqnToDisplayFormat } from "../../fullyqualifiedname";
import VrpcProvider from "../../vrpc/vrpcInterface";

export const getSignedRequestDisplayProps = async request => {
  const systemID = request.signature.systemID.toIAddress();
  const signerIdentityID = request.signature.identityID.toIAddress();
  const coinObj = CoinDirectory.getBasicCoinObj(systemID);

  if (!coinObj) {
    throw new Error("Unsupported system: " + systemID);
  }

  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

  let signerFqn = signerIdentityID;
  let sigtime = null;

  try {
    const signedBy = await getIdentity(coinObj.system_id, signerIdentityID);
    if (!signedBy.error && signedBy.result?.fullyqualifiedname) {
      signerFqn = convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname);
    }
  } catch (_) {}

  try {
    const sig = await getSignatureInfo(
      coinObj.system_id,
      signerIdentityID,
      request.signature.signatureAsVch.toString("base64"),
    );

    if (sig && sig.height != null) {
      const sigblock = await getBlock(coinObj.system_id, sig.height);
      if (!sigblock.error && sigblock.result) {
        sigtime = sigblock.result.time;
      }
    }
  } catch (_) {}

  return {
    signerFqn,
    signerSystemID: systemID,
    signerSystemName: getSystemNameFromSystemId(systemID),
    signerIdentityID,
    sigtime,
  };
};

export const getRequestScope = request => {
  try {
    if (request.appOrDelegatedID) {
      return request.appOrDelegatedID.toIAddress();
    }
  } catch (_) {}

  return request.signature.identityID.toIAddress();
};
