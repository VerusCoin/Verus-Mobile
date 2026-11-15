import { primitives } from "verusid-ts-client";
import { Buffer } from "buffer";
import { IdentitySignature, networks } from "@bitgo/utxo-lib";
import { AppEncryptionRequestOrdinalVDXFObject, EHashTypes } from "verus-typescript-primitives";
import VrpcProvider from "../../../../vrpc/vrpcInterface";
import { requestPrivKey } from "../../../../auth/authBox";
import { VRPC } from "../../../../constants/intervalConstants";
import { withAppEncryptionSigningKeys } from "../../../../deeplink/validator/appEncryptionAuthorization";

export const signGenericResponse = async (coinObj, response, context = {}) => {
  const genericResponse = new primitives.GenericResponse(response);
  const client = VrpcProvider.getVerusIdInterface(coinObj.system_id);

  if (context.request?.details.some(detail => detail instanceof AppEncryptionRequestOrdinalVDXFObject)) {
    const signature = genericResponse.signature;

    if (
      !signature || signature.systemID.toIAddress() !== coinObj.system_id ||
      signature.hasBoundHashes() || signature.hasStatements() ||
      signature.hasVdxfKeys() || signature.hasVdxfKeyNames()
    ) {
      throw new Error('Unsupported app encryption response signature.');
    }

    context.assertActive();
    const height = await client.getCurrentHeight();
    context.assertActive();
    genericResponse.setSigned();
    const hash = genericResponse.getDetailsIdentitySignatureHash(height);
    const identityID = signature.identityID.toIAddress();
    const combined = new IdentitySignature(
      networks.verus, 2, EHashTypes.HASH_SHA256, height, [], coinObj.system_id, identityID,
    );

    // The SDK's single-WIF signer replaces existing signatures. Accumulate the
    // fully controlled threshold over one response digest and block height.
    const selectedIdentity = {identityID, systemID: coinObj.system_id};

    await withAppEncryptionSigningKeys(context.request, selectedIdentity, context, key => {
      context.assertActive();
      combined.signHashOffline(hash, key);
    });
    context.assertActive();
    // Supply the full size: the library's allocator omits additional prefixes
    // for multisig (7-byte V2 header, then 1 + 65 bytes per compact signature).
    const signatureBytes = Buffer.alloc(7 + 66 * combined.signatures.length);
    combined.toBuffer(signatureBytes);
    signature.signatureAsVch = signatureBytes;
    return genericResponse;
  }

  return client.signGenericResponse(
    genericResponse,
    await requestPrivKey(coinObj.id, VRPC)
  );
};
