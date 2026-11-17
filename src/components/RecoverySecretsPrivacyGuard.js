import {useEffect} from 'react';
import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

const {VerusScreenSecurity} = NativeModules;

const RecoverySecretsPrivacyGuard = ({onCaptureChange}) => {
  useEffect(() => {
    if (!VerusScreenSecurity) return undefined;

    let active = true;
    const eventEmitter = new NativeEventEmitter(VerusScreenSecurity);
    const subscription = eventEmitter.addListener(
      'screenCaptureChanged',
      event => {
        if (active && typeof onCaptureChange === 'function') {
          onCaptureChange(event?.captured === true);
        }
      },
    );

    VerusScreenSecurity.setProtectionEnabled(true);
    VerusScreenSecurity.getCaptureState()
      .then(captured => {
        if (active && typeof onCaptureChange === 'function') {
          onCaptureChange(captured === true);
        }
      })
      .catch(() => {
        if (active && Platform.OS === 'ios') onCaptureChange?.(false);
      });

    return () => {
      active = false;
      subscription.remove();
      VerusScreenSecurity.setProtectionEnabled(false);
    };
  }, [onCaptureChange]);

  return null;
};

export default RecoverySecretsPrivacyGuard;
