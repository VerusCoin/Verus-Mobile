import ReactNativeHapticFeedback from "react-native-haptic-feedback";

export const triggerHaptic = (type) => {
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });
}

export const triggerLightHaptic = () => {
  triggerHaptic("impactLight")
}