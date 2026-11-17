import React, {useCallback, useState} from 'react';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {SecureStorage} from '../../../utils/keychain/secureStore';
import {SettingsRow} from './SettingsScaffold';
import {resetToSecureLoading} from './settingsTaskNavigation';

const KeychainEncryptionSettingRow = ({last = false, navigation}) => {
  const [usingKeychainEncryption] = useState(() => SecureStorage.isEncrypted());

  const canToggleKeychainEncryption = useCallback(
    () =>
      createAlert(
        usingKeychainEncryption
          ? 'Turn off keychain encryption?'
          : 'Turn on keychain encryption?',
        usingKeychainEncryption
          ? 'It adds device keychain encryption on top of the wallet password. Turn it off only if the wallet starts too slowly.'
          : 'The wallet then also encrypts its stored data with the device keychain.',
        [
          {
            text: 'Not now',
            onPress: () => resolveAlert(false),
            style: 'cancel',
          },
          {
            text: usingKeychainEncryption ? 'Turn off' : 'Turn on',
            onPress: () => resolveAlert(true),
          },
        ],
      ),
    [usingKeychainEncryption],
  );

  const toggleKeychainEncryption = useCallback(() => {
    const direction = usingKeychainEncryption ? 'off' : 'on';
    const showFailure = () =>
      createAlert(
        `Keychain encryption not turned ${direction}`,
        `The wallet could not turn it ${direction}. Try again.`,
      );

    canToggleKeychainEncryption().then(confirmed => {
      if (confirmed) {
        resetToSecureLoading(navigation, {
          task: async () => {
            try {
              let changed;

              if (usingKeychainEncryption) {
                await SecureStorage.decryptAllStorage();
                changed = !SecureStorage.isEncrypted();
              } else {
                await SecureStorage.encryptAllStorage();
                changed = SecureStorage.isEncrypted();
              }

              // The flow returns to Home, so this sheet is the only feedback.
              if (changed) {
                createAlert(`Keychain encryption turned ${direction}`);
              } else {
                showFailure();
              }
            } catch (e) {
              console.warn(e);
              showFailure();
            }
          },
          message: `Turning ${
            usingKeychainEncryption ? 'off' : 'on'
          } keychain encryption`,
          route: 'Home',
          successMsg: `Keychain encryption ${
            usingKeychainEncryption ? 'disabled' : 'enabled'
          } successfully`,
          errorMsg: `Failed to ${
            usingKeychainEncryption ? 'disable' : 'enable'
          } keychain encryption`,
        });
      }
    });
  }, [canToggleKeychainEncryption, navigation, usingKeychainEncryption]);

  return (
    <SettingsRow
      description="Extra protection for stored wallet data"
      icon="shield-key-outline"
      last={last}
      onPress={toggleKeychainEncryption}
      showChevron={false}
      title={`${usingKeychainEncryption ? 'Disable' : 'Enable'} keychain encryption`}
    />
  );
};

export default KeychainEncryptionSettingRow;
