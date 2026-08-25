import React from 'react';
import WalletBackupRequestInfo from '../../../DeepLink/WalletBackupRequestInfo/WalletBackupRequestInfo';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';

const NfcBackup = props => {
  const finishBackup = async () => {
    createAlert(
      'Backup Complete',
      'Your current profile seed has been written to the NFC card.',
    );
    props.navigation.goBack();
  };

  return (
    <WalletBackupRequestInfo
      cancel={() => props.navigation.goBack()}
      next={finishBackup}
      profileBackup
    />
  );
};

export default NfcBackup;
