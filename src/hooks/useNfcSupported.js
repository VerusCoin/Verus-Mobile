import {useEffect, useState} from 'react';
import {isNfcSupported} from '../utils/walletBackup/walletBackupNfc';

// NFC hardware does not change while the app runs, so every caller shares
// one native check.
let supportCheck = null;

const checkNfcSupport = () => {
  if (supportCheck == null) supportCheck = isNfcSupported();
  return supportCheck;
};

// False until the check resolves, so an NFC entry never appears and then
// disappears on a device without NFC.
export const useNfcSupported = () => {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let active = true;

    checkNfcSupport().then(result => {
      if (active) setSupported(result);
    });

    return () => {
      active = false;
    };
  }, []);

  return supported;
};
