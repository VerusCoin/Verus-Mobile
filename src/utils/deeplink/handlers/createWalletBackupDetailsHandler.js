import {
  CreateWalletBackupDetails,
  CreateWalletBackupDetailsOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import store from '../../../store';
import {
  getWalletBackupCompletionKey,
  hasCompletedWalletBackupRequest,
} from '../../walletBackup/walletBackupCompletionStorage';

export const handleCreateWalletBackupDetailsVDXFObject = async (
  request,
  response,
  detailIndex,
) => {
  const detail = request.getDetails(detailIndex);

  if (!detail || !(detail instanceof CreateWalletBackupDetailsOrdinalVDXFObject)) {
    throw new Error('Invalid CreateWalletBackupDetails detail at index ' + detailIndex);
  }

  if (!detail.data.backupType.eq(CreateWalletBackupDetails.NFC_NDEF_BACKUP)) {
    throw new Error('Unsupported wallet backup type. Only NFC NDEF backup is supported.');
  }

  const state = store.getState();
  const accountHash = state.authentication.activeAccount?.accountHash;
  const completionKey = getWalletBackupCompletionKey(
    request,
    detailIndex,
    accountHash,
  );

  if (completionKey && (await hasCompletedWalletBackupRequest(completionKey))) {
    return {
      response,
      handledIndices: [detailIndex],
    };
  }

  return {
    displayProps: {
      detailsBufferString: detail.data.toBuffer().toString('hex'),
      backupCompletionKey: completionKey,
      backupType: detail.data.backupType.toNumber(),
    },
    response,
    handledIndices: [],
  };
};
