import {useEffect, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

// Follows the system "Reduce motion" setting while the component is mounted.
export default function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        if (active) setReduceMotion(enabled === true);
      },
    );

    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (active) setReduceMotion(enabled === true);
      })
      .catch(() => {});

    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
}
