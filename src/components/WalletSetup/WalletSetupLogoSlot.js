import React, {useEffect, useRef} from 'react';
import {Animated} from 'react-native';
import {
  WALLET_SETUP_HANDOFF,
  registerWalletSetupTarget,
  useWalletSetupLogoHidden,
} from './walletSetupStore';

// Home's asset row logo. The wallet setup screen lands its coins here, so the
// logo stays hidden until its coin arrives, then fades in under the coin.
const WalletSetupLogoSlot = ({coinId, style, children}) => {
  const viewRef = useRef(null);
  const hidden = useWalletSetupLogoHidden(coinId);
  const opacity = useRef(new Animated.Value(hidden ? 0 : 1)).current;

  useEffect(
    () => registerWalletSetupTarget(coinId, viewRef.current),
    [coinId],
  );

  useEffect(() => {
    if (hidden) {
      opacity.stopAnimation();
      opacity.setValue(0);
      return undefined;
    }

    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: WALLET_SETUP_HANDOFF,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [hidden, opacity]);

  return (
    <Animated.View
      ref={viewRef}
      collapsable={false}
      style={[style, {opacity}]}>
      {children}
    </Animated.View>
  );
};

export default WalletSetupLogoSlot;
