import { DefinedKey, IdentityUpdateRequestOrdinalVDXFObject, GenericRequest, GenericResponse, DATA_TYPE_DEFINEDKEY, fqnToAddress, toIAddress, getDataKey } from "verus-typescript-primitives";
import VrpcProvider from '../../vrpc/vrpcInterface';
import { getBlock } from "../../api/channels/vrpc/requests/getBlock";
import { getSignatureInfo } from "../../api/channels/vrpc/requests/getSignatureInfo";
import { getFriendlyNameMap, getIdentity } from "../../api/channels/verusid/callCreators";
import { getIdentityContent } from "../../api/channels/verusid/requests/getIdentityContent";
import { getInfo } from "../../api/channels/vrpc/callCreators";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import { getSystemNameFromSystemId } from "../../CoinData/CoinData";
import { createUpdateIdentityTx, getUpdatableIdentity } from "../../api/channels/verusid/requests/updateIdentity";
import { convertFqnToDisplayFormat } from "../../fullyqualifiedname";
import { capitalizeString } from "../../stringUtils";
import { getKnownVDXFKeyName } from "../../vdxf/vdxfTypeLabels";

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
 *    coinObj: any;
 *    chainInfo: any;
 *    subjectIdentity: any;
 *    identityUpdates: any;
 *    friendlyNames: any;
 *    cmmDataKeys: any;
 *    subjectIdTxHex: string;
 *    updateIdTxHex: string;
 *  }
 *  response: GenericResponse;
 *  handledIndices: Array<number>;
 * }}
 */
export const handleIdentityUpdateRequestDetailsVDXFObject = async (request, response, detailIndex) => {
  /**
   * @type {IdentityUpdateRequestOrdinalVDXFObject}
   */
  const details = request.getDetails(detailIndex);

  if (details == null) throw new Error("Invalid index for request details");
  if (!(details instanceof IdentityUpdateRequestOrdinalVDXFObject)) throw new Error("Identity update request details not found at specified index");

  const rootSystem = request.isTestnet() ? 'VRSCTEST' : 'VRSC';
  const requestDetails = details.data;
  const requestSystem = requestDetails.containsSystem()
    ? requestDetails.systemID.toAddress()
    : rootSystem;

  const coinObj = CoinDirectory.getBasicCoinObj(requestSystem);
  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

  const chainInfo = await getInfo(coinObj.system_id);
  if (chainInfo.error) throw new Error(chainInfo.error.message);

  const identityAddress = requestDetails.getIdentityAddress(request.isTestnet());
  const subjectIdentityRes = await getIdentity(coinObj.system_id, identityAddress);
  if (subjectIdentityRes.error) throw new Error(subjectIdentityRes.error.message);

  const subjectIdentity = subjectIdentityRes.result;
  const updatableIdentity = await getUpdatableIdentity(coinObj.system_id, subjectIdentity);
  const subjectIdClass = updatableIdentity.identity;
  const subjectIdTxHex = updatableIdentity.tx;

  if (requestDetails.identity.containsFlags && requestDetails.identity.containsFlags()) {
    if (subjectIdClass.hasActiveCurrency() !== requestDetails.identity.hasActiveCurrency()) {
      throw new Error("Cannot change active currency status.");
    }

    if (subjectIdClass.hasTokenizedIdControl() !== requestDetails.identity.hasTokenizedIdControl()) {
      throw new Error("Cannot change tokenized id control status.");
    }
  }

  let friendlyNames;

  try {
    const initAddresses = [];

    if (requestDetails.identity.containsRevocation && requestDetails.identity.containsRevocation()) {
      initAddresses.push(requestDetails.identity.revocationAuthority.toAddress());
    }

    if (requestDetails.identity.containsRecovery && requestDetails.identity.containsRecovery()) {
      initAddresses.push(requestDetails.identity.recoveryAuthority.toAddress());
    }

    friendlyNames = await getFriendlyNameMap(coinObj.system_id, subjectIdentity, initAddresses);
  } catch (e) {
    friendlyNames = {
      ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
      ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
      [subjectIdentity.identity.identityaddress]: subjectIdentity.fullyqualifiedname
    };
  }

  if (requestDetails.expires() && requestDetails.expiryHeight.toNumber() - chainInfo.result.longestchain < 0) {
    const age = (requestDetails.expiryHeight.toNumber() - chainInfo.result.longestchain) * -1;
    throw new Error(`This request is expired (expired for approx. ${age} blocks).`);
  }

  let cmmDataKeys = {};

  try {
    const signingIAddr = request.signature.identityID.toIAddress();
    const contentRes = await getIdentityContent(coinObj.system_id, signingIAddr);

    if (contentRes.error) throw new Error(contentRes.error.message);
    else {
      const signerIdentity = contentRes.result.identity;

      if (signerIdentity.contentmultimap && signerIdentity.contentmultimap[DATA_TYPE_DEFINEDKEY.vdxfid]) {
        const definedKeyContent = signerIdentity.contentmultimap[DATA_TYPE_DEFINEDKEY.vdxfid];

        let definedKeyBufs = [];

        if (Array.isArray(definedKeyContent)) definedKeyBufs = definedKeyContent;
        else definedKeyBufs = [definedKeyContent];

        for (const definedKeyHex of definedKeyBufs) {
          try {
            const definedKey = new DefinedKey();
            definedKey.fromBuffer(Buffer.from(definedKeyHex, 'hex'));

            const iAddr = definedKey.getIAddr();
            const ns = definedKey.getNameSpaceID();

            if (ns !== signerIdentity.identityaddress) {
              throw new Error(`Found defined key ${definedKey.vdxfuri} with namespace ${ns} not matching signer ID.`);
            } else {
              const splitUri = definedKey.vdxfuri.split("::");
              const label = splitUri.length > 1 ? splitUri[1] : splitUri[0];

              cmmDataKeys[iAddr] = {
                vdxfuri: definedKey.vdxfuri,
                nsid: ns,
                label: capitalizeString(label.split('.').join(' ')),
              };
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }
  } catch (e) {
    console.warn(e);
  }

  if (requestDetails.identity != null) {
    const cmmKeys = requestDetails.getContentMultiMapKeys();
    const reqSigner = request.signature.identityID.toAddress();

    for (const key of cmmKeys) {
      if (key.includes("::")) {
        const fqnSplit = key.split("::");
        const fqnNamespace = toIAddress(fqnSplit[0], rootSystem);
        const dataKey = getDataKey(key, fqnNamespace, toIAddress(rootSystem)).id;
        const knownVDXFKey = getKnownVDXFKeyName(dataKey);

        if (knownVDXFKey != null) continue;

        if (fqnNamespace !== reqSigner) {
          throw new Error("Cannot use unknown cmm key not in signer namespace");
        }

        cmmDataKeys[dataKey] = {
          vdxfuri: key,
          nsid: fqnNamespace,
          label: capitalizeString(fqnSplit[1].split('.').join(' ')),
        };
      }
    }
  }

  const updateIdentityTx = await createUpdateIdentityTx(
    coinObj.system_id,
    requestDetails,
    subjectIdClass.getIdentityAddress(),
    subjectIdTxHex,
    subjectIdentity.blockheight,
    false,
    undefined,
    request.isTestnet()
  );

  const signerSystemID = request.signature.systemID.toIAddress();
  const signerSystemName = getSystemNameFromSystemId(signerSystemID);
  const signerIdentityID = request.signature.identityID.toIAddress();

  let signerFqn;
  let sigtime;

  if (signerSystemName) {
    const signerCoinObj = CoinDirectory.getBasicCoinObj(signerSystemName);
    const signedBy = await getIdentity(signerCoinObj.system_id, signerIdentityID);
    if (signedBy.error) throw new Error(signedBy.error.message);

    signerFqn = convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname);

    const sig = await getSignatureInfo(
      signerCoinObj.system_id,
      request.signature.identityID.toIAddress(),
      request.signature.signatureAsVch.toString('base64')
    );
    const sigblock = await getBlock(signerCoinObj.system_id, sig.height);
    if (sigblock.error) throw new Error(sigblock.error.message);
    sigtime = sigblock.result.time;
  } else {
    signerFqn = request.signature.identityID.toIAddress();
  }

  return {
    displayProps: {
      detailsBufferString: requestDetails.toBuffer().toString('hex'),
      sigtime,
      signerFqn,
      signerSystemID,
      signerSystemName,
      signerIdentityID,
      subjectIdentity,
      identityUpdates: updateIdentityTx.identity.toJson(),
      updateIdTxHex: updateIdentityTx.hex,
      coinObj,
      chainInfo: chainInfo.result,
      friendlyNames,
      cmmDataKeys,
      subjectIdTxHex,
    },
    response,
    handledIndices: []
  }
}
