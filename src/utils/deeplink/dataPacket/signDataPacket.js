import createHash from "create-hash";
import {
  CompactAddressObject,
  DataDescriptor,
  DataResponseDetails,
  DataResponseOrdinalVDXFObject,
  SignatureDataKey,
  VerifiableSignatureData,
  VdxfUniValue,
} from "verus-typescript-primitives";
import { requestPrivKey } from "../../auth/authBox";
import { VRPC } from "../../constants/intervalConstants";
import VrpcProvider from "../../vrpc/vrpcInterface";

const sha256 = buffer => createHash("sha256").update(buffer).digest();

export const getSignableObjectBuffer = signableObject => {
  if (typeof signableObject === "string") {
    return Buffer.from(signableObject, "utf8");
  }

  if (signableObject instanceof DataDescriptor) {
    return signableObject.toBuffer();
  }

  throw new Error("Unsupported signable object type.");
};

export const signDataPacketObject = async ({
  coinObj,
  identityAddress,
  signableObject,
}) => {
  const signableBuffer = getSignableObjectBuffer(signableObject);
  const signatureHash = sha256(signableBuffer);
  const privKey = await requestPrivKey(coinObj.id, VRPC);

  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

  const signature = await VrpcProvider
    .getVerusIdInterface(coinObj.system_id)
    .signHash(identityAddress, signatureHash, privKey, undefined, undefined, coinObj.system_id);

  const verifiableSignature = new VerifiableSignatureData({
    version: VerifiableSignatureData.TYPE_VERUSID_DEFAULT,
    systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
    identityID: CompactAddressObject.fromIAddress(identityAddress),
    signatureAsVch: Buffer.from(signature, "base64"),
  });

  return verifiableSignature.toSignatureData(signatureHash);
};

export const buildDataPacketResponse = async ({
  coinObj,
  identityAddress,
  dataPacketDetail,
}) => {
  const values = [];

  for (const signableObject of dataPacketDetail.signableObjects) {
    const signatureData = await signDataPacketObject({
      coinObj,
      identityAddress,
      signableObject,
    });

    values.push({ [SignatureDataKey.vdxfid]: signatureData });
  }

  for (const statement of dataPacketDetail.statements || []) {
    const signatureData = await signDataPacketObject({
      coinObj,
      identityAddress,
      signableObject: statement,
    });

    values.push({ [SignatureDataKey.vdxfid]: signatureData });
  }

  const dataDescriptor = new DataDescriptor({
    version: DataDescriptor.DEFAULT_VERSION,
    objectdata: new VdxfUniValue({ values }).toBuffer(),
  });

  return new DataResponseOrdinalVDXFObject({
    data: new DataResponseDetails({
      requestID: dataPacketDetail.requestID,
      data: dataDescriptor,
    }),
  });
};
