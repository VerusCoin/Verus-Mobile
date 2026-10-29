import {DataDescriptor} from 'verus-typescript-primitives';

// Group counts, multipart boundaries and MMR commitments are validated by the
// local SDK builder. Embedded data signatures remain outside Mobile's policy.
export const assertSupportedIdentityUploads = request => {
  const uploads = [...(request?.signDataMap?.entries() || [])];
  if (
    uploads.some(
      ([, upload]) => upload.address != null || upload.signature != null,
    )
  ) {
    throw new Error(
      'Identity uploads with embedded data signatures are not supported yet.',
    );
  }
};

export const assertCanonicalUploadDescriptor = descriptor => {
  const optional = [
    [DataDescriptor.FLAG_LABEL_PRESENT, 'label'],
    [DataDescriptor.FLAG_MIME_TYPE_PRESENT, 'mimeType'],
    [DataDescriptor.FLAG_SALT_PRESENT, 'salt'],
    [DataDescriptor.FLAG_ENCRYPTION_PUBLIC_KEY_PRESENT, 'epk'],
    [DataDescriptor.FLAG_INCOMING_VIEWING_KEY_PRESENT, 'ivk'],
    [DataDescriptor.FLAG_SYMMETRIC_ENCRYPTION_KEY_PRESENT, 'ssk'],
  ];
  for (const [flag, field] of optional) {
    if (!descriptor.flags.and(flag).isZero() && !descriptor[field]?.length) {
      throw new Error(
        'Identity upload contains an empty optional descriptor field.',
      );
    }
  }
};
