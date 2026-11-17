import React from 'react';
import WalletBackupRequestInfo from '../../../DeepLink/WalletBackupRequestInfo/WalletBackupRequestInfo';

const NfcBackup = props => {
  // The backup screen shows its own "Backup written" result before this runs.
  const finishBackup = async () => {
    props.navigation.goBack();
  };

  return (
    <WalletBackupRequestInfo
      cancel={() => props.navigation.goBack()}
      next={finishBackup}
      profileBackup
      walletPasswordTypedScope={props.route?.params?.walletPasswordTypedScope}
    />
  );
};

export default NfcBackup;
