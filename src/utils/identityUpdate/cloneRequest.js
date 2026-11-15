import {
  IdentityUpdateRequestDetails,
  KvMap,
  PartialMMRData,
  PartialSignData,
} from 'verus-typescript-primitives';

/** Normalize optional-field flags before a lossless binary request copy. */
export const cloneIdentityUpdateRequest = (
  details,
  rootSystemName = details.requestID?.rootSystemName || 'VRSC',
) => {
  let signDataMap;

  if (details.signDataMap) {
    signDataMap = new KvMap();
    for (const [key, upload] of details.signDataMap.entries()) {
      const data =
        upload.data instanceof PartialMMRData
          ? new PartialMMRData({
              ...upload.data,
              flags: upload.data.flags.clone(),
            })
          : upload.data;
      signDataMap.set(
        key,
        new PartialSignData({...upload, flags: upload.flags.clone(), data}),
      );
    }
  }

  const normalized = new IdentityUpdateRequestDetails({
    ...details,
    flags: details.flags.clone(),
    signDataMap,
  });
  const bytes = normalized.toBuffer();
  const copy = new IdentityUpdateRequestDetails();
  const consumed = copy.fromBuffer(bytes, 0, true, rootSystemName);
  if (consumed !== bytes.length || !copy.toBuffer().equals(bytes)) {
    throw new Error('The identity update request could not be copied safely.');
  }
  return copy;
};
