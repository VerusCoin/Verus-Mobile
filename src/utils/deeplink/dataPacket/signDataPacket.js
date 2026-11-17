import createHash from 'create-hash';
import {
  CompactAddressObject,
  DataDescriptor,
  DataResponseDetails,
  DataResponseOrdinalVDXFObject,
  SignatureDataKey,
  VerifiableSignatureData,
  VdxfUniValue,
} from 'verus-typescript-primitives';
import {requestPrivKey} from '../../auth/authBox';
import {VRPC} from '../../constants/intervalConstants';
import VrpcProvider from '../../vrpc/vrpcInterface';

const sha256 = buffer => createHash('sha256').update(buffer).digest();

export const getSignableObjectBuffer = signableObject => {
  if (typeof signableObject === 'string') {
    return Buffer.from(signableObject, 'utf8');
  }

  if (signableObject instanceof DataDescriptor) {
    return signableObject.toBuffer();
  }

  throw new Error('Unsupported signable object type.');
};

export const signDataPacketObject = async ({
  coinObj,
  identityAddress,
  signableObject,
  assertReviewCurrent = () => {},
  sessionScope,
}) => {
  assertReviewCurrent();
  const signableBuffer = getSignableObjectBuffer(signableObject);
  const signatureHash = sha256(signableBuffer);
  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);
  const signer = VrpcProvider.getVerusIdInterface(coinObj.system_id);
  const [height, identityResult] = await Promise.all([
    signer.getCurrentHeight(),
    signer.interface.getIdentity(identityAddress),
  ]);
  assertReviewCurrent();
  if (
    identityResult?.error ||
    !identityResult?.result ||
    !Number.isSafeInteger(height) ||
    height < 0
  ) {
    throw new Error('Unable to load the signing identity and block height.');
  }
  const privKey = await requestPrivKey(coinObj.id, VRPC, {sessionScope});
  assertReviewCurrent();
  const verifiableSignature = new VerifiableSignatureData({
    version: VerifiableSignatureData.TYPE_VERUSID_DEFAULT,
    systemID: CompactAddressObject.fromIAddress(coinObj.system_id),
    identityID: CompactAddressObject.fromIAddress(identityAddress),
  });

  const signature = await signer.signHash(
    identityAddress,
    verifiableSignature.getIdentityHash(height, signatureHash),
    privKey,
    identityResult.result,
    height,
    coinObj.system_id,
  );
  assertReviewCurrent();
  verifiableSignature.signatureAsVch = Buffer.from(signature, "base64");

  return verifiableSignature.toSignatureData(signatureHash);
};

export const buildDataPacketResponse = async ({
  coinObj,
  identityAddress,
  dataPacketDetail,
  assertReviewCurrent = () => {},
  sessionScope,
}) => {
  const values = [];

  for (const signableObject of dataPacketDetail.signableObjects) {
    const signatureData = await signDataPacketObject({
      coinObj,
      identityAddress,
      signableObject,
      assertReviewCurrent,
      sessionScope,
    });

    values.push({[SignatureDataKey.vdxfid]: signatureData});
  }

  for (const statement of dataPacketDetail.statements || []) {
    const signatureData = await signDataPacketObject({
      coinObj,
      identityAddress,
      signableObject: statement,
      assertReviewCurrent,
      sessionScope,
    });

    values.push({[SignatureDataKey.vdxfid]: signatureData});
  }

  const dataDescriptor = new DataDescriptor({
    version: DataDescriptor.DEFAULT_VERSION,
    objectdata: new VdxfUniValue({values}).toBuffer(),
  });

  return new DataResponseOrdinalVDXFObject({
    data: new DataResponseDetails({
      requestID: dataPacketDetail.requestID,
      data: dataDescriptor,
    }),
  });
};
