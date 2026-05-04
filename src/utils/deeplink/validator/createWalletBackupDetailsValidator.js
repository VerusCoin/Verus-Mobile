import {
  CreateWalletBackupDetails,
  CreateWalletBackupDetailsOrdinalVDXFObject,
} from 'verus-typescript-primitives';

export const validateCreateWalletBackupDetailsVDXFObject = async (
  request,
  detailIndex,
) => {
  const detail = request.getDetails(detailIndex);

  if (!detail) {
    throw new Error(`No detail found at index ${detailIndex}`);
  }

  if (!(detail instanceof CreateWalletBackupDetailsOrdinalVDXFObject)) {
    throw new Error('Detail at specified index is not a CreateWalletBackupDetails request.');
  }

  if (!detail.data || !detail.data.isValid()) {
    throw new Error('Invalid wallet backup request details.');
  }

  if (!detail.data.backupType.eq(CreateWalletBackupDetails.NFC_NDEF_BACKUP)) {
    throw new Error('Unsupported wallet backup type. Only NFC NDEF backup is supported.');
  }
};
