import {useEffect, useMemo, useState} from 'react';
import {Keyboard, Platform, useWindowDimensions} from 'react-native';

export const ONBOARDING_SMALL_DEVICE_MAX_HEIGHT = 667;
export const ONBOARDING_KEYBOARD_FOOTER_SPACING = 8;

export const useOnboardingSmallDeviceLayout = () => {
  const {height} = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return useMemo(() => {
    const smallDevice = height <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;

    return {
      keyboardVisible,
      smallDevice,
      compact: smallDevice,
      smallDeviceKeyboardVisible: smallDevice && keyboardVisible,
    };
  }, [height, keyboardVisible]);
};
