import {useWindowDimensions} from 'react-native';
import {ONBOARDING_SMALL_DEVICE_MAX_HEIGHT} from './useOnboardingSmallDeviceLayout';
import {APP_BUTTON_HEIGHT, APP_BUTTON_SMALL_HEIGHT} from '../styles/components/appButton.styles';

// Use the window, not the keyboard-contracted form, for the compact rule.
export const useButtonHeight = (variant = 'primary', height = APP_BUTTON_HEIGHT, preserveHeightOnSmallWindow = false) => {
  const {height: windowHeight} = useWindowDimensions();
  const action = ['primary', 'destructive', 'secondary', 'tonal'].includes(variant);
  return action && !preserveHeightOnSmallWindow && windowHeight <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT
    ? APP_BUTTON_SMALL_HEIGHT
    : height;
};

export const getButtonHitSlop = (height, hitSlop = 0) => {
  const vertical = Math.max(0, (48 - height) / 2);
  const edges = typeof hitSlop === 'number'
    ? {top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop}
    : hitSlop;
  return {
    ...edges,
    top: Math.max(vertical, edges?.top || 0),
    bottom: Math.max(vertical, edges?.bottom || 0),
  };
};
